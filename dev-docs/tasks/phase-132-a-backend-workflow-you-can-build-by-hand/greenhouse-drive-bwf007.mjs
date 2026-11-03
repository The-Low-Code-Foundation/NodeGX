// P132 BWF-007 AC2, in the Electron app on a copy of Greenhouse: *The morning check* emails "Plants that need water today"
// with the thirsty plants listed, built in Studio from the step menu, the conditions and the formula menus, no JSON.
//   1. after "Mark who is thirsty today": Find records (Plant, thirsty is true), then Send an email (To, Subject typed;
//      the Message a formula: the `name` of each found plant, joined by ", ");
//   2. tested with no email set up on the backend: the step fails in the words that say where to set it;
//   3. SMTP set on the backend (the backend manager's Email page does this; here its admin route), pointed at an SMTP
//      catcher this script runs on 127.0.0.1, and tested again: the warning names who it writes to, the email arrives.
// Reads, it does not grade: it prints what it measured. Run with NODEGX_REPO set to the NodeGX checkout (`npm run
// build` in packages/nodegx-backend first). It drops ELECTRON_RUN_AS_NODE (see greenhouse-drive-bwf005.mjs).
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const S = process.env.NODEGX_DRIVE_DIR || join(tmpdir(), 'p132-greenhouse-drive-bwf007');
const studio = '/Users/richardosborne/vscode_projects/nodegx-studio';
const SRC = '/Users/richardosborne/vscode_projects/NodeGX test projects/Greenhouse';
const root = join(S, 'gh'), gh = join(root, 'Greenhouse');
process.env.NODEGX_BACKENDS_DIR = join(root, 'backends');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(...a);

// the SMTP catcher: just enough of the protocol for nodemailer with no TLS and no login, every message kept
const caught = [];
const smtp = createServer((sock) => {
  let buf = '', data = false, msg = null;
  const out = (l) => sock.write(l + '\r\n');
  out('220 catcher ESMTP');
  sock.on('data', (d) => {
    buf += d.toString('utf8');
    for (;;) {
      if (data) {
        const end = buf.indexOf('\r\n.\r\n');
        if (end < 0) return;
        msg.data = buf.slice(0, end); buf = buf.slice(end + 5); data = false; caught.push(msg); msg = null; out('250 kept'); continue;
      }
      const nl = buf.indexOf('\r\n');
      if (nl < 0) return;
      const line = buf.slice(0, nl); buf = buf.slice(nl + 2);
      const cmd = line.slice(0, 4).toUpperCase();
      if (cmd === 'EHLO' || cmd === 'HELO') out('250 catcher');
      else if (cmd === 'MAIL') { msg = { from: line.slice(10), to: [] }; out('250 ok'); }
      else if (cmd === 'RCPT') { msg?.to.push(line.slice(8)); out('250 ok'); }
      else if (cmd === 'DATA') { data = true; out('354 go on'); }
      else if (cmd === 'QUIT') { out('221 bye'); sock.end(); }
      else out('250 ok');
    }
  });
  sock.on('error', () => {});
});
await new Promise((r) => smtp.listen(0, '127.0.0.1', r));
const smtpPort = smtp.address().port;
say('smtp catcher on', smtpPort);

rmSync(root, { recursive: true, force: true });
cpSync(SRC, gh, { recursive: true, filter: (p) => !/\/(\.git|node_modules|\.nodegx)(\/|$)/.test(p) });
{
  const at = join(gh, 'nodegx.project.json'), pj = JSON.parse(readFileSync(at, 'utf8'));
  delete pj.metadata.cloudservices; delete pj.metadata.cloudservicesLive;
  writeFileSync(at, JSON.stringify(pj, null, 2));
}
const backends = await import(join(studio, 'lib/backend.mjs'));
say('attach', JSON.stringify(await backends.attachNewBackend(gh)));
const { attach } = await import(join(studio, 'editor/cdp.mjs'));
const electron = createRequire(join(studio, 'app/check.mjs'))('electron');
const port = 9461;
const proc = spawn(electron, [studio, gh, '--hidden', `--remote-debugging-port=${port}`], { env: Object.fromEntries(Object.entries({ ...process.env, NODEGX_STUDIO_USER_DATA: join(root, 'ud'), NODEGX_STUDIO_SINGLE_INSTANCE: '1' }).filter(([k]) => k !== 'ELECTRON_RUN_AS_NODE')), stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; proc.stdout.on('data', (d) => (log += d)); proc.stderr.on('data', (d) => (log += d));
let b;
try {
  b = await attach({ port, width: 1600, height: 1000, match: (t) => /^http:\/\/127\.0\.0\.1:\d+\/?$/.test(t.url) });
  const ev = (x) => b.evaluate(x);
  for (let i = 0; i < 360 && !/^ready/.test(await ev('document.title')); i++) await wait(250);
  say('title', await ev('document.title'));
  const origin = await ev('location.origin');
  const api = async (path, init = {}) => { const r = await fetch(origin + path, { headers: { 'content-type': 'application/json' }, ...init }); return { status: r.status, json: await r.json().catch(() => null) }; };
  for (let i = 0; i < 120 && (await api('/api/backend-status')).json?.phase !== 'running'; i++) await wait(500);
  say('backend', JSON.stringify((await api('/api/backend-status')).json));
  say('deploy', JSON.stringify((await api('/api/functions/deploy', { method: 'POST' })).json).slice(0, 300));
  say('kinds served', JSON.stringify((await api('/api/backend/admin/workflow-step-kinds')).json?.kinds?.filter((k) => k.category === 'Workflow Integrations').map((k) => k.kind)));
  // three plants: two not watered for longer than they go without, one just watered
  const day = 86400000, ago = (n) => ({ __type: 'Date', iso: new Date(Date.now() - n * day).toISOString() });
  for (const [name, waterEvery, last] of [['Fern', 3, 10], ['Basil', 2, 5], ['Cactus', 30, 1]]) {
    const r = await api('/api/backend/classes/Plant', { method: 'POST', body: JSON.stringify({ name, room: 'Kitchen', waterEvery, lastWatered: ago(last) }) });
    say('plant', name, r.status);
  }
  await wait(1000);

  // the Backend tab, The morning check
  await ev(`document.querySelector('#rail [data-tab=backend]').click()`);
  for (let i = 0; i < 40 && !(await ev(`!!document.querySelector('#autolist .row[data-workflow="morning-check"]')`)); i++) await wait(250);
  await ev(`document.querySelector('#autolist .row[data-workflow="morning-check"]').click()`);
  for (let i = 0; i < 120 && !(await ev(`!!document.querySelector('#steps .testrow [data-act=sample]:not([disabled])') && !/Reading the sample/.test(document.querySelector('#steps .testrow')?.innerText)`)); i++) await wait(250);
  const at = async (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  const press = async (sel) => { const p = await at(sel); if (!p) throw new Error(`nothing at ${sel}`); await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await wait(60); await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await wait(400); };
  const until = async (js, n = 40) => { for (let i = 0; i < n && !(await ev(js)); i++) await wait(250); return ev(js); };
  // a <select>'s choice, and text typed then left (its change), as a person's do
  const choose = (sel, value) => ev(`(() => { const s = document.querySelector(${JSON.stringify(sel)}); if (!s) return false; s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const type = async (sel, text) => { const p = await at(sel); if (!p) throw new Error(`nothing to type in at ${sel}`); await ev(`(() => { const t = document.querySelector(${JSON.stringify(sel)}); t.focus(); t.select?.(); })()`); await b.send('Input.insertText', { text }); await ev(`document.querySelector(${JSON.stringify(sel)})?.dispatchEvent(new Event('change', { bubbles: true }))`); await wait(400); };
  const mark = (labelText, as) => ev(`(() => { const f = [...document.querySelectorAll('#wfinspect .field')].find((x) => x.querySelector(':scope > label')?.textContent === ${JSON.stringify(labelText)}); if (f) f.setAttribute('data-drive', ${JSON.stringify(as)}); return !!f; })()`);
  const wfNow = () => JSON.parse(readFileSync(join(gh, 'nodegx.automations.json'), 'utf8')).workflows.find((w) => w.id === 'morning-check');
  const step = (kind) => wfNow().steps.find((x) => x.kind === kind);

  // the sample: a schedule's fire, kept as offered
  await press('#steps .testrow [data-act=sample]');
  await until(`!!document.querySelector('.menu.sample [data-act=keepsample]')`);
  await press('.menu.sample [data-act=keepsample]');
  say('sample words', await ev(`document.querySelector('#steps .testrow .samplewords')?.innerText`));
  say('steps before', JSON.stringify(wfNow().steps.map((x) => [x.id, x.kind, x.next ?? null])));

  // 1a. Find records after the check
  await press('#steps .autoview .step[data-id="check"] h3');
  await until(`!!document.querySelector('#wfinspect [data-act=addafter]')`);
  await press('#wfinspect [data-act=addafter]');
  await until(`!!document.querySelector('.menu .item[data-kind="find-records"]')`);
  say('menu: Integrations', JSON.stringify(await ev(`(() => { const h = [...document.querySelectorAll('.menu.actions .h')].find((x) => x.textContent === 'Integrations'); const out = []; for (let n = h?.nextElementSibling; n && !n.classList.contains('h'); n = n.nextElementSibling) out.push(n.innerText.replace(/\\s+/g, ' ')); return out; })()`)));
  await press('.menu .item[data-kind="find-records"]');
  for (let i = 0; i < 40 && !step('find-records'); i++) await wait(250);
  if (!step('find-records')) throw new Error(`no Find records was added (${await ev(`document.getElementById('toast')?.textContent`)})`);
  await until(`!!document.querySelector('#wfinspect select[data-input=table]')`);
  if (step('find-records').params?.table !== 'Plant') { await choose('#wfinspect select[data-input=table]', 'Plant'); for (let i = 0; i < 40 && step('find-records')?.params?.table !== 'Plant'; i++) await wait(250); }
  await press('#wfinspect [data-act=addcond]');
  for (let i = 0; i < 40 && !step('find-records')?.params?.where?.length; i++) await wait(250);
  await until(`!!document.querySelector('#wfinspect [data-cond="0"] select[aria-label="Which field"]')`);
  await choose('#wfinspect [data-cond="0"] select[aria-label="Which field"]', 'thirsty');
  for (let i = 0; i < 40 && step('find-records')?.params?.where?.[0]?.field !== 'thirsty'; i++) await wait(250);
  await until(`!!document.querySelector('#wfinspect .reccond > .field.runvalue input[type=text]')`);
  await type('#wfinspect .reccond > .field.runvalue input[type=text]', 'true');
  for (let i = 0; i < 40 && step('find-records')?.params?.where?.[0]?.value !== true; i++) await wait(250);
  say('find', JSON.stringify(step('find-records')));

  // 1b. Send an email after the find
  const findId = step('find-records').id;
  say('find picked already', await ev(`!!document.querySelector('#steps .autoview .step.picked[data-id="${findId}"]')`), '| addafter', await ev(`!!document.querySelector('#wfinspect [data-act=addafter]')`));
  if (!(await ev(`!!document.querySelector('#steps .autoview .step.picked[data-id="${findId}"]')`))) await press(`#steps .autoview .step[data-id="${findId}"] h3`);
  // a find has two sides: the email goes on "found something", so a quiet morning sends none
  await until(`!!document.querySelector('#wfinspect [data-act="add-nonempty"]')`);
  say('find: then', JSON.stringify(await ev(`[...document.querySelectorAll('#wfinspect .thenline, #wfinspect .warn, #wfinspect .after button')].map((x) => x.innerText)`)));
  await press('#wfinspect [data-act="add-nonempty"]');
  await until(`!!document.querySelector('.menu .item[data-kind="send-email"]')`);
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf007-menu.png'));
  await press('.menu .item[data-kind="send-email"]');
  for (let i = 0; i < 40 && !step('send-email'); i++) await wait(250);
  if (!step('send-email')) throw new Error(`no Send an email was added (${await ev(`document.getElementById('toast')?.textContent`)})`);
  const mail = () => step('send-email');
  say('added', JSON.stringify(mail()));
  await until(`!!document.querySelector('#wfinspect .field.runvalue')`);
  say('form', JSON.stringify(await ev(`[...document.querySelectorAll('#wfinspect .props > .field > label, #wfinspect .props .sechead')].map((l) => l.textContent)`)));
  await mark('To', 'to'); await type('#wfinspect [data-drive=to] input[type=text]', 'gardener@greenhouse.test');
  for (let i = 0; i < 40 && mail()?.params?.to !== 'gardener@greenhouse.test'; i++) await wait(250);
  await mark('Subject', 'subject'); await type('#wfinspect [data-drive=subject] input[type=text]', 'Plants that need water today');
  for (let i = 0; i < 40 && mail()?.params?.subject !== 'Plants that need water today'; i++) await wait(250);
  // the Message: a formula, Join, its list a formula, Pick a field from each, its list the found items
  await mark('Message', 'body');
  say('message box', await ev(`document.querySelector('#wfinspect [data-drive=body] textarea') ? 'a textarea' : document.querySelector('#wfinspect [data-drive=body]')?.innerHTML.slice(0, 200)`));
  await choose('#wfinspect [data-drive=body] .rvmode', 'fn');
  await until(`!!document.querySelector('.menu.formulas .item[data-fn="join"]')`);
  await press('.menu.formulas .item[data-fn="join"]');
  for (let i = 0; i < 40 && mail()?.params?.body?.$fn !== 'join'; i++) await wait(250);
  await until(`!!document.querySelector('#wfinspect .formula[data-fn="join"] > .field[data-arg="list"] .rvmode')`);
  await choose('#wfinspect .formula[data-fn="join"] > .field[data-arg="list"] .rvmode', 'fn');
  await until(`!!document.querySelector('.menu.formulas .item[data-fn="pick"]')`);
  await press('.menu.formulas .item[data-fn="pick"]');
  for (let i = 0; i < 40 && mail()?.params?.body?.args?.[0]?.$fn !== 'pick'; i++) await wait(250);
  await until(`!!document.querySelector('#wfinspect .formula[data-fn="pick"] > .field[data-arg="list"] .rvmode')`);
  await choose('#wfinspect .formula[data-fn="pick"] > .field[data-arg="list"] .rvmode', 'from');
  const items = `upstream.${findId}.items`;
  await until(`!!document.querySelector('.menu.picker .pickfield[data-path="${items}"]')`);
  say('picker offers', JSON.stringify(await ev(`[...document.querySelectorAll('.menu.picker .pickfield')].map((x) => x.dataset.path).filter((p) => p.startsWith('upstream.'))`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf007-picker.png'));
  await press(`.menu.picker .pickfield[data-path="${items}"]`);
  for (let i = 0; i < 40 && mail()?.params?.body?.args?.[0]?.args?.[0]?.$path !== items; i++) await wait(250);
  await type('#wfinspect .formula[data-fn="pick"] > .field[data-arg="field"] input[type=text]', 'name');
  for (let i = 0; i < 40 && mail()?.params?.body?.args?.[0]?.args?.[1] !== 'name'; i++) await wait(250);
  await type('#wfinspect .formula[data-fn="join"] > .field[data-arg="separator"] input[type=text]', ', ');
  for (let i = 0; i < 40 && mail()?.params?.body?.args?.[1] !== ', '; i++) await wait(250);
  await wait(500);
  say('email step', JSON.stringify(mail()));
  say('message reads', await ev(`document.querySelector('#wfinspect [data-drive=body] .fxwords')?.innerText ?? document.querySelector('#wfinspect .formula[data-fn="join"] > .fxwords')?.innerText`));
  say('steps after', JSON.stringify(wfNow().steps.map((x) => [x.id, x.kind, x.next ?? null])));
  say('backend has', JSON.stringify((await api('/api/backend/admin/workflow-defs/morning-check')).json?.workflow?.steps?.map((x) => [x.id, x.kind])));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf007-built.png'));

  const lastRun = async () => (await api('/api/backend/admin/workflow-defs')).json.lastRuns?.['morning-check']?.id;
  const test = async (label) => {
    const prior = await lastRun();
    await press('#steps .testrow [data-act=test]');
    await wait(400);
    say(`${label}: warning`, await ev(`document.querySelector('.surescrim')?.innerText`));
    if (await ev(`!!document.querySelector('.surescrim [data-act=yes]')`)) await press('.surescrim [data-act=yes]');
    for (let i = 0; i < 80 && (await lastRun()) === prior; i++) await wait(250);
    await wait(1200);
    say(`${label}: run line`, await ev(`document.querySelector('#steps .fnfacts .run')?.innerText`));
    const rec = (await api(`/api/backend/executions/${await lastRun()}`)).json;
    say(`${label}: record`, JSON.stringify({ status: rec.status, steps: rec.steps.map((s) => [s.nodeId, s.status, s.error ?? null]) }));
    return rec;
  };
  // 2. no email set up
  const r1 = await test('no SMTP');
  if (!(await ev(`!!document.querySelector('#steps .autoview .step.picked[data-id="${mail().id}"]')`))) await press(`#steps .autoview .step[data-id="${mail().id}"] h3`);
  await wait(800);
  say('no SMTP: the step says', await ev(`document.querySelector('#wfinspect .rundata')?.innerText?.slice(0, 500)`));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf007-no-smtp.png'));
  // 3. SMTP set, at the catcher; tested again
  const put = await api('/api/backend/admin/email/config', { method: 'PUT', body: JSON.stringify({ enabled: true, smtp: { host: '127.0.0.1', port: smtpPort, secure: false, username: '' }, fromAddress: 'greenhouse@greenhouse.test', fromName: 'Greenhouse' }) });
  say('smtp set', put.status, JSON.stringify(put.json).slice(0, 200));
  const r2 = await test('SMTP set');
  say('caught', caught.length, JSON.stringify(caught.map((m) => ({ from: m.from, to: m.to, subject: /^Subject: (.*)$/m.exec(m.data)?.[1], text: m.data.split('\r\n\r\n').slice(1).join('\n').slice(0, 400) }))));
  if (!(await ev(`!!document.querySelector('#steps .autoview .step.picked[data-id="${mail().id}"]')`))) await press(`#steps .autoview .step[data-id="${mail().id}"] h3`);
  await wait(800);
  say('SMTP set: the step says', await ev(`document.querySelector('#wfinspect .rundata')?.innerText?.slice(0, 500)`));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf007-sent.png'));
  // a third test: the same recipients, so no second question
  await test('again');
  say('caught now', caught.length);
  void r1; void r2;
} catch (e) {
  say('ERROR', e.stack);
  say(log.slice(-2000));
} finally {
  try { b?.close?.(); } catch {}
  proc.kill();
  smtp.close();
  await wait(1500);
  const left = spawnSync('pgrep', ['-f', join(root, 'backends')], { encoding: 'utf8' }).stdout.trim();
  if (left) { say('stopping leftover backend', left); for (const pid of left.split('\n')) try { process.kill(Number(pid)); } catch {} }
}
