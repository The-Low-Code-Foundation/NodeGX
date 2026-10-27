// P127 BKO-003: the map reads any app, not the training app. Three apps that are not it, each on a COPY with
// a backend of its own, driven in Chrome:
//   todo      the todo-list template: rows written by its screens, no function, no group, a fresh backend
//   site      Muddy Paws, a marketing site: no table at all
//   grooming  a site with a backend shaped the way the agent makes one: a Pointer column to another table and
//             one to the people, one group ("groomer") named in its rules file, two people. Its backend
//             answers every question but its groups (a proxy refuses /admin/roles)
// For each: no training word on the page or on the canvas, in any panel; "Look at it as" offers the app's
// own kinds of person and its real people, and each one answers; a table the app has and the backend lacks
// is drawn and said so.
//
//   node test/any-app.test.mjs [folder for pictures]

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { createEditor, serve } from '../server.mjs';
import { freePort, stop, makeCopy, startBackend, adminClient, hashTree } from './copies.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TODO = process.env.TODO_LIST ?? path.resolve(here, '..', '..', '..', '..', '..', 'templates', 'todo-list');
// Muddy Paws is Richard's project; a copy is made and the original is checked untouched at the end. It is not on every
// computer (gone from Richard's on 2026-10-27), so the landing-pages template, the same shape (pages, no table, no
// function, no rules file), stands in for it
const MUDDY = path.resolve(here, '..', '..', '..', '..', '..', '..', 'NodeGX test projects', 'Muddy Paws');
const SITE = process.env.MUDDY_PAWS ?? (fs.existsSync(MUDDY) ? MUDDY : path.resolve(here, '..', '..', '..', '..', '..', 'templates', 'landing-pages'));
// the training app's own words: none may reach the page of an app that isn't it
const TRAINING = /\b(learners?|staff|training|courses?|concepts?|cohorts?|programmes?)\b/i;

let failures = 0;
const ok = (cond, words, detail) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${words}${!cond && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ''}`);
  if (!cond) failures++;
};

/** A user, as the app's sign-up makes one (the data door, with the master key). */
async function addPerson(base, token, fields, roles = []) {
  const res = await fetch(`${base}/classes/_User`, { method: 'POST', headers: { 'X-Parse-Master-Key': token, 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
  const made = await res.json();
  if (!made.objectId) throw new Error(`no person made: ${JSON.stringify(made)}`);
  const admin = adminClient(base, token);
  for (const r of roles) await admin(`/admin/roles/${encodeURIComponent(r)}/users`, { method: 'POST', body: JSON.stringify({ userId: made.objectId }) });
  return made.objectId;
}
const addRow = (base, token, table, row) =>
  fetch(`${base}/classes/${table}`, { method: 'POST', headers: { 'X-Parse-Master-Key': token, 'Content-Type': 'application/json' }, body: JSON.stringify(row) }).then((r) => r.json());

/** A door to the backend that passes everything on but refuses one path, so the map meets a failing source. */
async function refusingProxy(target, refuse) {
  const server = http.createServer((req, res) => {
    if (req.url.split('?')[0] === refuse) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'refused on purpose by the test' }));
    }
    const up = http.request(target + req.url, { method: req.method, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    up.on('error', () => res.destroy());
    req.pipe(up);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

/** The grooming app's rules, written into its copy before its backend starts, as the agent's tool leaves them. */
const GROOMING_RULES = {
  version: 1,
  devOpen: false,
  defaults: { permissions: { find: 'nobody', get: 'nobody', create: 'nobody', update: 'nobody', delete: 'nobody' }, creatorOwns: false },
  collections: {
    Pet: { permissions: { find: 'authenticated', get: 'authenticated', create: 'role:groomer', update: 'role:groomer', delete: 'role:groomer' }, creatorOwns: false },
    Booking: { permissions: { find: 'role:groomer', get: 'role:groomer', create: 'authenticated', update: 'role:groomer', delete: 'nobody' }, creatorOwns: true }
  },
  functions: {},
  files: { upload: 'nobody', read: 'nobody', delete: 'nobody' },
  signup: 'public'
};

const apps = {
  async todo(c, base) {
    // someone has an account; nobody has saved a task, so the backend has no Task table yet
    await addPerson(base, c.token, { username: 'ana', email: 'ana@example.com' });
    return base;
  },
  async site(c, base) {
    return base;
  },
  async grooming(c, base) {
    const rules = GROOMING_RULES;
    const admin = adminClient(base, c.token);
    const applied = await admin('/admin/schema/apply', {
      method: 'POST',
      body: JSON.stringify({
        source: {
          tables: [
            { name: 'Pet', columns: [{ name: 'name', type: 'String' }, { name: 'breed', type: 'String' }] },
            { name: 'Booking', columns: [{ name: 'pet', type: 'Pointer', targetClass: 'Pet' }, { name: 'client', type: 'Pointer', targetClass: '_User' }, { name: 'note', type: 'String' }, { name: 'day', type: 'String' }] }
          ]
        }
      })
    });
    if (applied.result?.skipped?.length) throw new Error(`schema skipped: ${applied.result.skipped.join('; ')}`);
    await admin('/admin/permissions', { method: 'PUT', body: JSON.stringify(rules) });
    await admin('/admin/roles', { method: 'POST', body: JSON.stringify({ name: 'groomer' }) });
    await addPerson(base, c.token, { username: 'gwen', email: 'gwen@example.com', firstName: 'Gwen' }, ['groomer']);
    const carl = await addPerson(base, c.token, { username: 'carl', email: 'carl@example.com', firstName: 'Carl' });
    const pet = await addRow(base, c.token, 'Pet', { name: 'Biscuit', breed: 'spaniel' });
    await addRow(base, c.token, 'Booking', { pet: { __type: 'Pointer', className: 'Pet', objectId: pet.objectId }, client: { __type: 'Pointer', className: '_User', objectId: carl }, note: 'muddy again', day: 'Tuesday' });
    return (await refusingProxy(base, '/admin/roles')).url;
  }
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const siteBefore = fs.existsSync(SITE) ? hashTree(SITE) : null;
try {
  for (const [name, setup] of Object.entries(apps)) {
    const source = name === 'todo' ? TODO : SITE;
    if (!fs.existsSync(source)) {
      ok(false, `${name}: the app to copy is at ${source}`);
      continue;
    }
    console.log(`\n— ${name} —`);
    const c = makeCopy(source, `any-${name}`);
    if (name === 'grooming') fs.writeFileSync(path.join(c.copy, 'nodegx.security.json'), JSON.stringify(GROOMING_RULES, null, 2) + '\n');
    const shots = path.resolve(process.argv[2] ?? c.work);
    fs.mkdirSync(shots, { recursive: true });
    const port = await freePort();
    const be = await startBackend(c, port);
    const base = `http://127.0.0.1:${port}`;
    let server;
    try {
      const door = await setup(c, base);
      const tablesBefore = (await adminClient(base, c.token)('/admin/schema')).tables.map((t) => t.name).sort();
      server = await serve(createEditor({ project: c.copy, backend: door, token: c.token }), 0);
      const url = `http://127.0.0.1:${server.address().port}/`;
      const page = await browser.newPage();
      await page.setViewport({ width: 1600, height: 1000 });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => window.__map?.map && window.__map.nodes.length > 0, { timeout: 30000 });
      await page.screenshot({ path: path.join(shots, `bko-003-${name}-map.png`) });

      // every word the map shows: the page, the canvas, and each block's panel
      const seen = [await page.evaluate(() => document.body.innerText), ...(await page.evaluate(() => window.__canvasWords()))];
      const ids = await page.evaluate(() => window.__map.nodes.filter((n) => n.kind !== 'person').map((n) => n.id));
      for (const id of ids) {
        await page.evaluate((id) => {
          const s = window.__map, n = s.byId[id];
          const at = [n.x * s.cam.z + s.cam.x + 30, (n.y + n.h / 2) * s.cam.z + s.cam.y];
          document.getElementById('map').dispatchEvent(new PointerEvent('pointerdown', { clientX: at[0], clientY: at[1], pointerId: 1, bubbles: true }));
          document.getElementById('map').dispatchEvent(new PointerEvent('pointerup', { clientX: at[0], clientY: at[1], pointerId: 1, bubbles: true }));
        }, id);
        await page.waitForFunction((id) => document.getElementById('panelBody').dataset.node === id, { timeout: 5000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 150));
        seen.push(await page.$eval('#panelBody', (e) => e.innerText));
      }
      const hits = seen.flatMap((t) => (t.match(new RegExp(TRAINING.source, 'gi')) ?? []).map((w) => `${w} (in “${t.slice(Math.max(0, t.search(TRAINING) - 40), t.search(TRAINING) + 40).replace(/\s+/g, ' ')}”)`));
      ok(!hits.length, `${name}: no training word on the page, the canvas or any of its ${ids.length} panels`, hits.slice(0, 4));
      const twice = /\b([A-Za-z][\w ]{2,40}?) or \1\b/;
      ok(!twice.test(seen.join('\n')), `${name}: no rule says the same words twice (“Anyone signed in or Anyone signed in”)`, seen.join('\n').match(twice)?.[0]);
      ok(!/\b1 things\b/.test(seen.join('\n')), `${name}: one thing in a row is “1 thing”`);

      // Look at it as: the app's own kinds of person, then its real people
      const options = await page.$$eval('#personPick option', (os) => os.map((o) => ({ value: o.value, text: o.textContent })));
      const kinds = options.filter((o) => o.value.startsWith('kind:'));
      const real = await page.evaluate(() => window.__map.people.map((p) => ({ id: p.id, name: p.name })));
      const rulesFile = path.join(c.copy, 'nodegx.security.json');
      const rules = fs.existsSync(rulesFile) ? JSON.parse(fs.readFileSync(rulesFile, 'utf8')) : {};
      const fileRoles = [...new Set(JSON.stringify(rules).match(/role:[\w-]+/g) ?? [])].map((r) => r.slice(5));
      ok(kinds.some((k) => k.text === 'Anyone signed in') && fileRoles.every((r) => kinds.some((k) => k.text === `Someone in the ${r} group`)), `${name}: “Look at it as” offers anyone signed in${fileRoles.length ? ` and the ${fileRoles.join(', ')} group, read from the rules file` : ''}`, kinds.map((k) => k.text));
      for (const k of kinds) {
        await page.select('#personPick', k.value);
        const note = await page.$eval('#lensNote', (e) => (e.classList.contains('hidden') ? '' : e.innerText));
        ok(note.startsWith(k.text) && /can (run|read)/.test(note), `${name}: as “${k.text}”: “${note.slice(0, 120)}”`, note);
      }
      if (kinds.length) await page.screenshot({ path: path.join(shots, `bko-003-${name}-as-${kinds.at(-1).value.split(':').pop()}.png`) });
      const panels = {};
      const lookAs = async (who, act) => {
        await act();
        await page.waitForFunction(() => window.__map.reach && !window.__map.reach.loading, { timeout: 60000 });
        const r = await page.evaluate(() => ({ error: window.__map.reach.error ?? null, note: document.getElementById('lensNote').innerText, panel: document.getElementById('panel').classList.contains('hidden') ? '' : document.getElementById('panelBody').innerText }));
        panels[who] = r.panel;
        ok(!r.error && /can reach/.test(r.note), `${name}: as ${who}: “${r.note.slice(0, 110)}”`, r);
      };
      await lookAs('someone not signed in', () => page.click('.lens button[data-lens="anon"]'));
      for (const p of real) await lookAs(p.name, () => page.select('#personPick', p.id));
      if (real.length) await page.screenshot({ path: path.join(shots, `bko-003-${name}-as-${real.at(-1).name.split(' ')[0].toLowerCase()}.png`) });
      await page.click('.lens button[data-lens="all"]');

      const after = (await adminClient(base, c.token)('/admin/schema')).tables.map((t) => t.name).sort();
      ok(JSON.stringify(after) === JSON.stringify(tablesBefore), `${name}: looking made no table on the backend (it has ${after.join(', ')})`, { before: tablesBefore, after });
      ok(!errors.length, `${name}: no page errors`, errors);

      if (name === 'todo') {
        const task = await page.evaluate(() => ({ node: !!window.__map.byId['t:Task'], not: window.__map.byId['t:Task']?.table.notOnBackend }));
        ok(task.node && task.not, 'todo: Task, which the app writes and the fresh backend lacks, is drawn and marked not on the backend', task);
        ok(!(await page.evaluate(() => !!window.__map.byId['t:LearnerProfile'])), 'todo: no LearnerProfile block (the training app’s table)');
        // Studio's Privacy → "See it on the map" opens the map at #t:<type>: a fresh page (a hash alone reloads nothing)
        await page.goto('about:blank');
        await page.goto(url + '#t:Task', { waitUntil: 'networkidle0' });
        await page.waitForFunction(() => window.__map?.selected === 't:Task', { timeout: 20000 }).catch(() => {});
        const said = await page.$eval('#panelBody', (e) => e.innerText).catch(() => '');
        ok(/Not on the backend yet/.test(said) && /Anyone signed in adds and changes; nobody deletes/.test(said), `todo: #t:Task opens on Task, which says it isn’t on the backend yet and who adds, changes and deletes: “${said.slice(0, 160).replace(/\s+/g, ' ')}”`, said);
        await page.screenshot({ path: path.join(shots, 'bko-003-todo-task.png') });
      }
      if (name === 'site') {
        const card = await page.$eval('#secure', (e) => e.textContent);
        ok(/reads and writes no table yet/.test(card), 'site: an app with no data says so, in words', card.slice(0, 200));
      }
      if (name === 'grooming') {
        const m = await page.evaluate(() => ({ line: document.getElementById('backendLine').innerText, tables: window.__map.map.tables.map((t) => t.name), links: window.__map.map.links }));
        ok(/couldn’t read its groups/.test(m.line) && m.tables.includes('Booking') && m.tables.includes('Pet'), `grooming: its groups refused, the rest of the map is up: “${m.line}”`, m);
        ok(m.links.some((l) => l.from === 'Booking' && l.to === 'Pet' && l.column === 'pet' && !l.byName) && m.links.some((l) => l.from === 'Booking' && l.to === '_User' && l.column === 'client' && !l.byName), 'grooming: the Pointer columns are links the schema declares (Booking → Pet by pet, → People by client)', m.links);
        const card = await page.$eval('#secure', (e) => e.textContent);
        ok(/Couldn’t read the backend’s groups/.test(card), 'grooming: the safety card names the source it couldn’t read');
        const gap = await page.evaluate(() => {
          const col = (k) => window.__map.nodes.filter((n) => n.kind === k);
          return Math.min(...col('table').map((n) => n.x)) - Math.max(...col('person').map((n) => n.x + n.w));
        });
        ok(gap > 0 && gap <= 200, `grooming: with no screen and no function, the tables sit beside the people (${gap} apart), not across an empty middle`, gap);
        const gwen = panels.Gwen ?? '';
        ok(/The app has no function, so this is the backend’s own rule check/.test(gwen) && !/Click a screen/.test(gwen) && !/These are real runs/.test(gwen), 'grooming: Gwen’s panel says how the map knows without functions, invites no screen click and claims no runs', gwen.slice(0, 600));
      }
      await page.close();
    } finally {
      if (server) server.close();
      await stop(be);
    }
  }
} catch (e) {
  ok(false, `the drive ran to the end: ${e.stack ?? e.message}`);
} finally {
  await browser.close();
}
if (siteBefore) ok(JSON.stringify(hashTree(SITE)) === JSON.stringify(siteBefore), 'Muddy Paws itself was not touched (only its copies were)');
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
