// BMG-003 AC1–AC8 through the page, with the server measured beside every step.
// Rendered text is `innerText` of #main / .drawer / .modal (the inlined bundle is not in it).
export default async ({ ev, sleep, nav, shot, typeText }) => {
  const port = process.env.PORT || '8697';
  const base = `http://127.0.0.1:${port}`;
  const out = { checks: {} };
  const ok = (name, pass, detail) => {
    out.checks[name] = { pass: !!pass, detail };
    console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  };
  const J = JSON.stringify;
  const call = async (method, p, body, headers = {}) => {
    const r = await fetch(base + p, { method, headers: { authorization: 'Bearer t0k', ...headers, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const click = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); e.click(); return true})()`);
  const clickText = (sel, text) =>
    ev(`(function(){var b=[...document.querySelectorAll(${J(sel)})].find(function(b){return b.textContent.trim()===${J(text)}}); if(!b) throw new Error('no '+${J(sel + ' ' + text)}+' among '+[...document.querySelectorAll(${J(sel)})].map(function(b){return b.textContent.trim()}).join('|')); b.click(); return true})()`);
  const setVal = (sel, v) =>
    ev(`(function(){var e=document.querySelector(${J(sel)}); if(!e) throw new Error('no '+${J(sel)}); var proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${J(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  const txt = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e.innerText.trim() : null})()`);
  const exists = (sel) => ev(`!!document.querySelector(${J(sel)})`);
  const attr = (sel, a) => ev(`(function(){var e=document.querySelector(${J(sel)}); return e ? e[${J(a)}] : null})()`);
  const open = async (hash) => {
    await nav('about:blank');
    await nav(`${base}/_admin#token=t0k`);
    await sleep(1200);
    await ev(`location.hash = ${J(hash)}`);
    await sleep(1500);
  };
  const schemaOf = async (table) => (await call('GET', `/admin/schema/${table}`)).json;
  const colType = async (table, name) => {
    const s = await schemaOf(table);
    const c = (s.columns || []).find((x) => x.name === name);
    return c ? c.type : null;
  };
  const lastToast = () => ev(`(function(){var t=[...document.querySelectorAll('.toast')]; return t.length ? t[t.length-1].innerText.trim() : null})()`);
  // The drawer: pick a tile, fill the options, Add.
  const pickKind = async (kind) => {
    await click(`.drawer .tile input[value="${kind}"]`);
    await sleep(300);
  };
  const addField = async () => {
    await clickText('.drawer-foot button', 'Add field');
    await sleep(1400);
  };
  const confirmTyped = async (name, verb) => {
    await setVal('.modal input', name);
    await sleep(150);
    await clickText('.modal button', verb);
    await sleep(1400);
  };

  // ---- AC6 first look: the card, no red control in the header ---------------------------------------
  await open('#/schema/Pet');
  await shot('bmg003-cards');
  const headerButtons = await ev(`[...document.querySelectorAll('#schema-Pet .row')[0].querySelectorAll('button')].map(function(b){return b.className+':'+b.textContent.trim()})`);
  ok('AC6 the Pet card header has Open records / Add field / Indexes and no red control', J(headerButtons) === J(['btn tiny:Open records', 'btn tiny:Add field', 'btn tiny:Indexes']), headerButtons);
  const zoneButtons = await ev(`[...document.querySelectorAll('#schema-Pet .danger-zone button')].map(function(b){return b.textContent.trim()})`);
  ok('AC6 the danger zone holds Empty collection and Delete collection', J(zoneButtons) === J(['Empty collection', 'Delete collection']), zoneButtons);
  ok('the card counts its records', /2 records/.test(await txt('#schema-Pet .row')), await txt('#schema-Pet .row'));

  // ---- AC7: the deep link opens the picker ------------------------------------------------------------
  await open('#/schema/Pet/new-field');
  const tiles = await ev(`[...document.querySelectorAll('.drawer .tile b')].map(function(b){return b.textContent})`);
  ok('AC7 #/schema/Pet/new-field opens the drawer on eleven tiles', (await exists('.drawer')) && tiles.length === 11 && tiles[0] === 'Text' && tiles[10] === 'Anything', tiles);
  await shot('bmg003-picker');
  await setVal('.drawer .kind-search', 'pic');
  await sleep(200);
  ok('the picker search narrows to Picture or file', (await ev(`document.querySelectorAll('.drawer .tile').length`)) === 1 && (await txt('.drawer .tile b')) === 'Picture or file');
  await setVal('.drawer .kind-search', '');
  await sleep(200);

  // ---- AC1 + AC5 + AC8 + AC3: every tile through the drawer ------------------------------------------
  // Text, unique (AC3), with a max length and looks-like — and Required on an existing collection asks for a default (AC5, 2 records).
  await pickKind('text');
  await sleep(300);
  const opts = await ev(`[...document.querySelectorAll('.drawer #kind-options input, .drawer #kind-options select')].map(function(e){return e.getAttribute('aria-label')})`);
  ok('a Text field shows only Default / Max length / Must look like', J(opts) === J(['Default', 'Max length', 'Must look like']), opts);
  await setVal('.drawer input[aria-label="Field name"]', 'email');
  await click('.drawer input[aria-label="Required"]');
  await sleep(200);
  // R6 (Richard, 2026-09-26): over records the box is a ONE-TIME FILL, not a default (BMG-016).
  ok('AC5/R6 over 2 records, Required turns the box into the one-time fill and says it is not a default', !(await attr('.drawer #kind-options input[aria-label="Fill the 2 records already here with"]', 'disabled')) && /It is not a default/.test(await txt('.drawer')), (await txt('.drawer')).slice(0, 300));
  await addField();
  const needsDefault = await txt('.drawer .notice.bad');
  ok('AC5/R6 Add without a fill is refused in words', /Say what the 2 records already in the collection get/.test(needsDefault || ''), needsDefault);
  await shot('bmg003-required-needs-default');
  await click('.drawer input[aria-label="Required"]');
  await sleep(150);
  await setVal('.drawer #kind-options input[aria-label="Max length"]', '80');
  await setVal('.drawer #kind-options select[aria-label="Must look like"]', 'email');
  await click('.drawer input[aria-label="Must be unique"]');
  await sleep(150);
  await shot('bmg003-text-options');
  await addField();
  ok('AC1 Text → String', (await colType('Pet', 'email')) === 'String');
  let pet = await schemaOf('Pet');
  ok('AC3 Must be unique wrote a unique index the table route lists', !!(pet.indexes || []).find((i) => i.name === 'idx_Pet_email' && i.unique && i.built), pet.indexes);
  ok('the max length and looks-like are rules the backend enforces', J((pet.checks || []).map((c) => c.description).sort()) === J(['email is at most 80 characters', 'email looks like an email address']), pet.checks);
  const dupA = await call('POST', '/api/Pet', { name: 'A', email: 'a@b.co' });
  const dupB = await call('POST', '/api/Pet', { name: 'B', email: 'a@b.co' });
  const badMail = await call('POST', '/api/Pet', { name: 'C', email: 'nope' });
  ok('AC3 a duplicate is refused (409/137); a value that does not look like an email is refused with the rule', dupA.status === 201 && dupB.status === 409 && dupB.json.code === 137 && badMail.status === 400 && /looks like an email address/.test(badMail.json.error), { dupB: dupB.status, badMail: badMail.json && badMail.json.error });

  // Number with bounds and whole numbers only.
  await ev(`location.hash = '#/schema/Pet/new-field'`);
  await sleep(900);
  await pickKind('number');
  await setVal('.drawer input[aria-label="Field name"]', 'age');
  await setVal('.drawer #kind-options input[aria-label="At least"]', '0');
  await setVal('.drawer #kind-options input[aria-label="At most"]', '30');
  await click('.drawer input[aria-label="Whole numbers only"]');
  await setVal('.drawer #kind-options input[aria-label="Default"]', '1');
  await sleep(150);
  await shot('bmg003-number-options');
  await addField();
  ok('AC1 Number → Number, with default 1', (await colType('Pet', 'age')) === 'Number' && (await schemaOf('Pet')).columns.find((c) => c.name === 'age').defaultValue === 1);
  const half = await call('POST', '/api/Pet', { name: 'D', age: 2.5 });
  const big = await call('POST', '/api/Pet', { name: 'E', age: 31 });
  ok('a fraction and an out-of-range number are refused with the rule', half.status === 400 && /age is a whole number/.test(half.json.error) && big.status === 400 && /age is between 0 and 30/.test(big.json.error), { half: half.json && half.json.error, big: big.json && big.json.error });

  // Yes / No with a default of Yes, never typed (AC8).
  await ev(`location.hash = '#/schema/Pet/new-field'`);
  await sleep(900);
  await pickKind('yesno');
  await setVal('.drawer input[aria-label="Field name"]', 'vaccinated');
  await click('.drawer input[aria-label="Has a default"]');
  await sleep(150);
  await click('.drawer input[aria-label="Default value"]');
  await sleep(150);
  const yesnoInputs = await ev(`[...document.querySelectorAll('.drawer #kind-options input, .drawer #kind-options select, .drawer #kind-options textarea')].map(function(e){return e.type+'='+e.value})`);
  ok('AC8 a Yes / No default is two switches; nothing on the drawer takes the words true/false', J(yesnoInputs) === J(['checkbox=on', 'checkbox=on']) && /Default: Yes/.test(await txt('.drawer')), yesnoInputs);
  await shot('bmg003-yesno-options');
  await addField();
  ok('AC1 Yes / No → Boolean, default true', (await colType('Pet', 'vaccinated')) === 'Boolean' && (await schemaOf('Pet')).columns.find((c) => c.name === 'vaccinated').defaultValue === true);
  const rowWords = await ev(`(function(){var tr=[...document.querySelectorAll('#schema-Pet tbody tr')].find(function(r){return r.innerText.indexOf('vaccinated')===0}); return tr ? [...tr.querySelectorAll('td')].map(function(c){return c.innerText.trim()}) : null})()`);
  ok('AC8 the row says the default as Yes, and the kind as Yes / No with its Boolean badge', !!rowWords && rowWords[3] === 'Yes' && /Yes \/ No/.test(rowWords[1]) && /Boolean/.test(rowWords[1]), rowWords);
  ok('AC8 the words true/false appear nowhere on the page', !/\b(true|false)\b/.test(await txt('#main')));

  // Date, Choice (AC2), Link, Links, Picture or file, Location, List, Anything.
  await ev(`location.hash = '#/schema/Pet/new-field'`);
  await sleep(900);
  await pickKind('date');
  await setVal('.drawer input[aria-label="Field name"]', 'born');
  await addField();
  ok('AC1 Date & time → Date', (await colType('Pet', 'born')) === 'Date');

  await ev(`location.hash = '#/schema/Pet/new-field'`);
  await sleep(900);
  await pickKind('choice');
  await setVal('.drawer input[aria-label="Field name"]', 'status');
  await ev(`document.querySelector('.drawer #choice-values input').focus()`);
  await typeText('open');
  await ev(`document.querySelector('.drawer #choice-values input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);
  await sleep(150);
  await typeText('closed');
  await ev(`document.querySelector('.drawer #choice-values input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);
  await sleep(150);
  const chips = await ev(`[...document.querySelectorAll('.drawer #choice-values .chip')].map(function(c){return c.textContent.replace('✕','').trim()})`);
  ok('a Choice edits its values as chips', J(chips) === J(['open', 'closed']), chips);
  await setVal('.drawer #kind-options select[aria-label="Default"]', 'open');
  await shot('bmg003-choice-options');
  await addField();
  pet = await schemaOf('Pet');
  ok('AC1 Choice → String + the one-of rule, default open', (await colType('Pet', 'status')) === 'String' && !!(pet.checks || []).find((c) => c.description === 'status is one of open, closed' && c.built) && pet.columns.find((c) => c.name === 'status').defaultValue === 'open', pet.checks);
  const other = await call('POST', '/api/Pet', { name: 'F', status: 'other' });
  ok('AC2 a record outside the choices is refused by the backend, 400 with the rule', other.status === 400 && other.json.code === 142 && /status is one of open, closed/.test(other.json.error), other.json && other.json.error);
  const ruleWords = await ev(`[...document.querySelectorAll('#schema-Pet .rule > span')].map(function(s){return s.textContent})`);
  ok('the card lists its rules in words', ruleWords.indexOf('status is one of open, closed') !== -1 && ruleWords.indexOf('age is between 0 and 30') !== -1, ruleWords);
  await shot('bmg003-card-rules');

  for (const [kind, name, target] of [['link', 'owner', 'Owner'], ['links', 'tags', 'Tag'], ['file', 'photo'], ['location', 'place'], ['list', 'items'], ['anything', 'extra']]) {
    await ev(`location.hash = '#/schema/Pet/new-field'`);
    await sleep(900);
    await pickKind(kind);
    await setVal('.drawer input[aria-label="Field name"]', name);
    if (target) {
      await setVal('.drawer #kind-options select[aria-label="Points at"]', target);
      await sleep(150);
      if (kind === 'link') ok('a Link says its sentence', /Each record links to one Owner/.test(await txt('.drawer')));
      if (kind === 'links') ok('Links says its sentence', /Each record links to many Tag/.test(await txt('.drawer')));
    }
    await addField();
  }
  pet = await schemaOf('Pet');
  const types = Object.fromEntries((pet.columns || []).map((c) => [c.name, c.type + (c.targetClass ? '→' + c.targetClass : '')]));
  ok('AC1 Link → Pointer→Owner, Links → Relation→Tag, Picture or file → File, Location → GeoPoint, List → Array, Anything → Object', types.owner === 'Pointer→Owner' && types.tags === 'Relation→Tag' && types.photo === 'File' && types.place === 'GeoPoint' && types.items === 'Array' && types.extra === 'Object', types);
  await shot('bmg003-card-full');

  // AC2 on the record drawer: status is a select of the two.
  const rex = (await call('GET', '/api/Pet?limit=1&where=' + encodeURIComponent(J({ name: 'Rex' })))).json.results[0];
  await open(`#/collections/Pet/${rex.objectId}`);
  const statusOptions = await ev(`(function(){var s=document.querySelector('.drawer select[aria-label="status"]'); return s ? [...s.options].map(function(o){return o.textContent}) : null})()`);
  ok('AC2 the record drawer shows status as a select of the two choices', J(statusOptions) === J(['— none —', 'open', 'closed']), statusOptions);
  const ageAttrs = await ev(`(function(){var i=document.querySelector('.drawer input[aria-label="age"]'); return i ? [i.type, i.min, i.max, i.step] : null})()`);
  ok('the record drawer bounds age to 0–30 in whole steps', J(ageAttrs) === J(['number', '0', '30', '1']), ageAttrs);
  await shot('bmg003-record-choice');

  // ---- AC5 on an empty collection: Required disables Default with the reason ------------------------
  await open('#/schema/Empty/new-field');
  await pickKind('text');
  await setVal('.drawer input[aria-label="Field name"]', 'code');
  await click('.drawer input[aria-label="Required"]');
  await sleep(200);
  ok('AC5 on an empty collection Required disables Default, with the reason visible', (await attr('.drawer #kind-options input[aria-label="Default"]', 'disabled')) === true && /A required field has no default: every record must say it\./.test(await txt('.drawer')));
  await shot('bmg003-required-disables-default');
  await addField();
  const strict = await call('POST', '/api/Empty', { note: 'x' });
  ok('the required field is enforced: a record without it is refused in words', strict.status === 400 && /"code" is required on "Empty"/.test(strict.json.error), strict.json && strict.json.error);

  // ---- AC4: drop a field ------------------------------------------------------------------------------
  await open('#/schema/Pet');
  await click('#schema-Pet button[aria-label="Drop the field born"]');
  await sleep(900);
  const dropAsk = await txt('.modal');
  ok('AC4 ✕ asks with the count: no record holds a value in born', /No record holds a value in it/.test(dropAsk || '') && /type/i.test(dropAsk || ''), dropAsk);
  await shot('bmg003-drop-ask');
  await confirmTyped('born', 'Drop');
  ok('AC4 the column is gone from the schema', (await colType('Pet', 'born')) === null);
  await click('#schema-Pet button[aria-label="Drop the field status"]');
  await sleep(900);
  await confirmTyped('status', 'Drop');
  const refusedToast = await lastToast();
  ok('AC4 a column a rule reads is refused, naming the rule', /the rule "status is one of open, closed" reads it\. Remove that rule first\./.test(refusedToast || ''), refusedToast);
  ok('AC4 the refused column is still there', (await colType('Pet', 'status')) === 'String');
  await click('#schema-Pet button[aria-label="Remove the rule: status is one of open, closed"]');
  await sleep(1200);
  await click('#schema-Pet button[aria-label="Drop the field status"]');
  await sleep(900);
  const countAsk = await txt('.modal');
  // Three: Rex and Tom got the Choice's default of "open" when the column was added (a stored DEFAULT backfills), and A was created after.
  const holding = (await call('GET', '/api/Pet?count=1&limit=0&where=' + encodeURIComponent(J({ status: { $exists: true } })))).json.count;
  ok('AC4 with the rule gone the ✕ asks with the count of records holding a value, equal to the server’s', holding > 0 && new RegExp(holding + ' records? holds? a value in it').test(countAsk || ''), { countAsk, holding });
  await confirmTyped('status', 'Drop');
  ok('AC4 the column dropped once its rule was removed', (await colType('Pet', 'status')) === null);
  const emailDrop = await call('POST', '/admin/schema', { action: 'dropColumn', table: '_User', column: 'email' });
  const indexedDrop = await call('POST', '/admin/schema', { action: 'dropColumn', table: 'Pet', column: 'email' });
  ok('AC4 _User.email is refused; a column in an index is refused naming the index', emailDrop.status === 400 && /how a person signs in/.test(emailDrop.json.error) && indexedDrop.status === 409 && /the index idx_Pet_email \(email, unique\) reads it/.test(indexedDrop.json.error), { emailDrop: emailDrop.json.error, indexedDrop: indexedDrop.json.error });
  await shot('bmg003-after-drops');

  // ---- AC6: Empty collection and Delete collection, behind the typed name --------------------------------
  await clickText('#schema-Pet .danger-zone button', 'Empty collection');
  await sleep(600);
  const emptyAsk = await txt('.modal');
  const goDisabled = await ev(`(function(){var b=[...document.querySelectorAll('.modal button')].find(function(b){return b.textContent.trim()==='Empty'}); return b ? b.disabled : null})()`);
  ok('AC6 Empty collection asks with the count and refuses until the name is typed', /records? in "Pet"/.test(emptyAsk || '') && goDisabled === true, emptyAsk);
  await confirmTyped('Pet', 'Empty');
  await sleep(800);
  const left = (await call('GET', '/api/Pet?count=1&limit=0')).json.count;
  ok('AC6 Empty collection deleted every record and kept the fields', left === 0 && (await colType('Pet', 'age')) === 'Number', { left });
  await shot('bmg003-emptied');
  await clickText('#schema-Empty .danger-zone button', 'Delete collection');
  await sleep(600);
  await setVal('.modal input', 'Empt');
  await sleep(150);
  const stillDisabled = await ev(`(function(){var b=[...document.querySelectorAll('.modal button')].find(function(b){return b.textContent.trim()==='Delete collection'}); return b ? b.disabled : null})()`);
  ok('AC6 Delete collection refuses without the exact name', stillDisabled === true);
  await confirmTyped('Empty', 'Delete collection');
  ok('AC6 with the name typed, the collection is deleted', (await call('GET', '/admin/schema/Empty')).status === 404);
  await shot('bmg003-end');

  const fs = await import('fs');
  const passed = Object.values(out.checks).filter((c) => c.pass).length;
  out.summary = `${passed}/${Object.keys(out.checks).length}`;
  console.log('SUMMARY', out.summary);
  fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));
};
