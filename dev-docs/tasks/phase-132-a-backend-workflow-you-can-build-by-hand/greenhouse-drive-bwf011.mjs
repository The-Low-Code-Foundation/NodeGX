// P132 BWF-011 AC1 (AC3's Electron half), in the Electron app on a copy of Greenhouse: *The morning check* gets a Find
// records (Plant) and a Send an email; the email's Subject is typed by a person's hands as "Water " + the first plant's
// name + " today": words typed, *+ A value* pressed, the found items picked, the chip pressed and refined to the first
// one's name (AC2's two presses), more words typed; no formula menu is opened (watched). Then tested: an SMTP catcher
// this script runs on 127.0.0.1 receives it, and the subject is printed beside the first plant the Find found.
// (Built from greenhouse-drive-bwf007.mjs's setup.)
//
// Reads, it does not grade: it prints what it measured. Run with NODEGX_REPO set to the NodeGX checkout (`npm run
// build` in packages/nodegx-backend first). It drops ELECTRON_RUN_AS_NODE (see greenhouse-drive-bwf005.mjs).
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const S = process.env.NODEGX_DRIVE_DIR || join(tmpdir(), 'p132-greenhouse-drive-bwf011');
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
  // the sample: a schedule's fire, kept as offered; SMTP at the catcher from the start
  await press('#steps .testrow [data-act=sample]');
  await until(`!!document.querySelector('.menu.sample [data-act=keepsample]')`);
  await press('.menu.sample [data-act=keepsample]');
  const put = await api('/api/backend/admin/email/config', { method: 'PUT', body: JSON.stringify({ enabled: true, smtp: { host: '127.0.0.1', port: smtpPort, secure: false, username: '' }, fromAddress: 'greenhouse@greenhouse.test', fromName: 'Greenhouse' }) });
  say('smtp set', put.status);

  // Find records (Plant) after the check, then Send an email on "found something"
  await press('#steps .autoview .step[data-id="check"] h3');
  await until(`!!document.querySelector('#wfinspect [data-act=addafter]')`);
  await press('#wfinspect [data-act=addafter]');
  await until(`!!document.querySelector('.menu .item[data-kind="find-records"]')`);
  await press('.menu .item[data-kind="find-records"]');
  for (let i = 0; i < 40 && !step('find-records'); i++) await wait(250);
  await until(`!!document.querySelector('#wfinspect select[data-input=table]')`);
  if (step('find-records').params?.table !== 'Plant') { await choose('#wfinspect select[data-input=table]', 'Plant'); for (let i = 0; i < 40 && step('find-records')?.params?.table !== 'Plant'; i++) await wait(250); }
  const findId = step('find-records').id;
  if (!(await ev(`!!document.querySelector('#steps .autoview .step.picked[data-id="${findId}"]')`))) await press(`#steps .autoview .step[data-id="${findId}"] h3`);
  await until(`!!document.querySelector('#wfinspect [data-act="add-nonempty"]')`);
  await press('#wfinspect [data-act="add-nonempty"]');
  await until(`!!document.querySelector('.menu .item[data-kind="send-email"]')`);
  await press('.menu .item[data-kind="send-email"]');
  for (let i = 0; i < 40 && !step('send-email'); i++) await wait(250);
  const mail = () => step('send-email');
  await until(`!!document.querySelector('#wfinspect .field.runvalue')`);
  await mark('To', 'to');
  say('To is', await ev(`document.querySelector('#wfinspect [data-drive=to] .vcompose') ? 'a composer' : 'not a composer'`));

  // AC1 by a person's hands: the formula menu watched the whole time
  await ev(`window.__fx = 0; window.__fxw = new MutationObserver(() => { if (document.querySelector('.menu.formulas')) window.__fx++; }); window.__fxw.observe(document.body, { childList: true, subtree: true }); 0`);
  const typeIn = async (sel, text, { clear = false, atEnd = true } = {}) => {
    await press(sel);
    if (clear) { await ev(`(() => { const c = document.querySelector(${JSON.stringify(sel)}); const r = document.createRange(); r.selectNodeContents(c); const s = getSelection(); s.removeAllRanges(); s.addRange(r); })()`); }
    else if (atEnd) { await ev(`(() => { const c = document.querySelector(${JSON.stringify(sel)}); const r = document.createRange(); r.selectNodeContents(c); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); })()`); }
    await b.send('Input.insertText', { text }); await wait(300);
  };
  await typeIn('#wfinspect [data-drive=to] .vcompose', 'gardener@greenhouse.test', { clear: true });
  await press('#steps .autoview .step[data-id="check"] h3'); await wait(300); // pressed elsewhere: the box is left, and kept
  for (let i = 0; i < 40 && mail()?.params?.to !== 'gardener@greenhouse.test'; i++) await wait(250);
  say('to', JSON.stringify(mail()?.params?.to));
  await press(`#steps .autoview .step[data-id="${mail().id}"] h3`);
  await until(`!!document.querySelector('#wfinspect .field.runvalue')`);
  await mark('Subject', 'subject');
  await typeIn('#wfinspect [data-drive=subject] .vcompose', 'Water ', { clear: true });
  // + A value, pressed with the cursor after "Water "
  await press('#wfinspect [data-drive=subject] [data-act=addvalue]');
  const items = `upstream.${findId}.items`;
  await until(`!!document.querySelector('.menu.picker .pickfield[data-path="${items}"]')`);
  await press(`.menu.picker .pickfield[data-path="${items}"]`);
  for (let i = 0; i < 40 && mail()?.params?.subject?.$fn !== 'text'; i++) await wait(250);
  say('after the value', JSON.stringify(mail()?.params?.subject));
  // AC2: the chip, then "the first one's name": two presses
  await mark('Subject', 'subject');
  await until(`!!document.querySelector('#wfinspect [data-drive=subject] .vcompose .pill[data-path="${items}"]')`);
  await press(`#wfinspect [data-drive=subject] .vcompose .pill[data-path="${items}"]`);
  await until(`!!document.querySelector('.menu.chipmenu [data-refine]')`);
  say('chip offers', JSON.stringify(await ev(`[...document.querySelectorAll('.menu.chipmenu [data-refine]')].map((x) => x.dataset.refine)`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf011-chipmenu.png'));
  await press(`.menu.chipmenu [data-refine="the first one's name"]`);
  for (let i = 0; i < 40 && mail()?.params?.subject?.args?.[1]?.$path !== `${items}.0.name`; i++) await wait(250);
  say('after refining', JSON.stringify(mail()?.params?.subject));
  // " today" typed at its end, then the box left
  await mark('Subject', 'subject');
  await typeIn('#wfinspect [data-drive=subject] .vcompose', ' today');
  await press('#steps .autoview .step[data-id="check"] h3'); await wait(300);
  for (let i = 0; i < 40 && mail()?.params?.subject?.args?.length !== 3; i++) await wait(250);
  say('subject in the file', JSON.stringify(mail()?.params?.subject));
  say('subject on the backend', JSON.stringify((await api('/api/backend/admin/workflow-defs/morning-check')).json?.workflow?.steps?.find((x) => x.kind === 'send-email')?.params?.subject));
  say('formula menus opened', await ev(`(window.__fxw.disconnect(), window.__fx)`));
  await press(`#steps .autoview .step[data-id="${mail().id}"] h3`); await wait(500);
  await mark('Subject', 'subject');
  say('the composer reads', JSON.stringify(await ev(`document.querySelector('#wfinspect [data-drive=subject] .vcompose')?.innerText`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf011-composed.png'));

  // the test: the email caught here
  const lastRun = async () => (await api('/api/backend/admin/workflow-defs')).json.lastRuns?.['morning-check']?.id;
  const prior = await lastRun();
  say('test button', JSON.stringify(await ev(`(() => { const t = document.querySelector('#steps .testrow [data-act=test]'); return t && { disabled: t.disabled, title: t.title, row: document.querySelector('#steps .testrow')?.innerText, toast: document.getElementById('toast')?.textContent }; })()`)));
  await press('#steps .testrow [data-act=test]'); await wait(400);
  say('warning', await ev(`document.querySelector('.surescrim')?.innerText`));
  if (await ev(`!!document.querySelector('.surescrim [data-act=yes]')`)) await press('.surescrim [data-act=yes]');
  for (let i = 0; i < 80 && (await lastRun()) === prior; i++) await wait(250);
  for (let i = 0; i < 40 && !caught.length; i++) await wait(250);
  const rec = (await api(`/api/backend/executions/${await lastRun()}`)).json;
  say('record', JSON.stringify({ status: rec?.status, steps: rec?.steps?.map((s) => [s.nodeId, s.status, s.error ?? null]) }));
  say('first plant found', JSON.stringify(rec?.steps?.find((s) => s.nodeId === findId)?.outputData?.items?.[0]?.name));
  say('caught', caught.length, JSON.stringify(caught.map((m) => ({ to: m.to, subject: /^Subject: (.*)$/m.exec(m.data)?.[1] }))));
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
