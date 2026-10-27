// P127 BKO-005, the map's half: what the backend starts by itself is drawn as the head of a flow. A trigger is a block
// under the screens, wired to each function it runs (a workflow's: each function its steps run) and, for a row change,
// to the table it watches. Two parts:
//   lib     triggerFlows() on fixtures: full and short names, two functions with one short name, a workflow's steps,
//           a workflow nobody has, one only in the file, one only on the backend
//   drive   a copy of the members-area template, its backend started from the copy (which seeds the file's triggers
//           and workflow), one trigger added to the file after, one made on the backend only; the map driven in Chrome
//
//   node test/triggers.test.mjs [folder for pictures]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { triggerFlows, functionNamed } from '../lib/triggers.mjs';
import { freePort, stop, makeCopy, startBackend, adminClient } from './copies.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MEMBERS = process.env.MEMBERS_AREA ?? path.resolve(here, '..', '..', '..', '..', '..', 'templates', 'members-area');

let failures = 0;
const ok = (cond, words, detail) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${words}${!cond && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ''}`);
  if (!cond) failures++;
};

// ─── lib ───
console.log('— triggerFlows —');
{
  const functions = ['Cloud Functions/Monthly Reminders', 'Cloud Functions/Send Reminder', 'a/Tidy', 'b/Tidy'];
  ok(functionNamed('Cloud Functions/Send Reminder', functions) === 'Cloud Functions/Send Reminder', 'a full name finds its function');
  ok(functionNamed('Monthly Reminders', functions) === 'Cloud Functions/Monthly Reminders', 'a short name only one function has finds it');
  ok(functionNamed('Tidy', functions) === null, 'a short name two functions have finds neither');
  const file = {
    workflows: [
      {
        id: 'settle',
        name: 'Monthly settle-up',
        steps: [
          { id: 'a', kind: 'call-function', ref: 'Monthly Reminders', next: ['b'] },
          { id: 'b', kind: 'for-each', ref: 'Cloud Functions/Send Reminder' },
          { id: 'c', kind: 'wait', params: { milliseconds: 10 } }
        ]
      }
    ],
    triggers: [
      { id: 'fileOnly', type: 'schedule', enabled: true, target: { kind: 'function', name: 'Cloud Functions/Send Reminder' }, schedule: { cron: '0 9 * * 1' } },
      { id: 'both', type: 'schedule', enabled: true, target: { kind: 'workflow', name: 'settle' }, schedule: { cron: '0 9 1 * *' } }
    ]
  };
  const backend = [
    { id: 'both', type: 'schedule', enabled: false, target: { kind: 'workflow', name: 'settle' }, schedule: { cron: '0 9 1 * *' }, scheduleWords: 'On the 1st of every month at 09:00', status: { lastFiredAt: null, lastResult: null } },
    { id: 'beOnly', type: 'db-change', enabled: true, target: { kind: 'function', name: 'Tidy' }, dbChange: { collection: 'Expense', actions: ['create', 'update'] } },
    { id: 'noWf', type: 'webhook', enabled: true, target: { kind: 'workflow', name: 'gone' }, webhook: { slug: 'paid' } }
  ];
  const flows = Object.fromEntries(triggerFlows({ backend, workflows: [], file, functions }).map((t) => [t.id, t]));
  ok(Object.keys(flows).sort().join() === 'beOnly,both,fileOnly,noWf', 'one flow per trigger, from both sources, none twice', Object.keys(flows));
  ok(flows.both.fns.join() === 'Cloud Functions/Monthly Reminders,Cloud Functions/Send Reminder' && !flows.both.unresolved.length, 'a workflow’s trigger runs each function its steps name; a wait step is not a miss', flows.both);
  ok(flows.both.scheduleWords === 'On the 1st of every month at 09:00' && flows.both.enabled === false, 'the backend’s copy is drawn where both have it (its words, its on/off)', flows.both);
  ok(flows.both.workflow?.name === 'Monthly settle-up' && flows.both.workflow.steps === 3, 'the workflow is named, with its step count', flows.both.workflow);
  ok(flows.fileOnly.notOnBackend && !flows.fileOnly.notInFile, 'one only in the file is not on the backend yet', flows.fileOnly);
  ok(flows.beOnly.notInFile && !flows.beOnly.notOnBackend, 'one only on the backend is missing from the file', flows.beOnly);
  ok(flows.beOnly.table === 'Expense' && flows.beOnly.actions.join() === 'create,update', 'a row change names its table and its actions', flows.beOnly);
  ok(!flows.beOnly.fns.length && flows.beOnly.unresolved.join() === 'Tidy', 'a function name two functions end with is unresolved, not guessed', flows.beOnly);
  ok(flows.noWf.workflowMissing && !flows.noWf.fns.length, 'a workflow nobody has is said, with no function', flows.noWf);
  const noFile = triggerFlows({ backend, workflows: [], file: null, functions });
  ok(noFile.every((t) => !t.notInFile), 'with no automations file, nothing is called missing from it');
}

// ─── drive ───
console.log('\n— the map, on a members-area copy —');
const AUTOMATIONS = {
  version: 1,
  workflows: [
    {
      id: 'on-request',
      name: 'Answer a request',
      entry: 'decide',
      steps: [
        { id: 'decide', name: 'Decide', kind: 'call-function', ref: 'decideMembership', next: ['tell'] },
        { id: 'tell', name: 'Tell the members', kind: 'call-function', ref: 'notifyMembers' }
      ]
    }
  ],
  triggers: [
    { id: 'trg_daily', type: 'schedule', name: 'Morning news', enabled: true, target: { kind: 'function', name: 'notifyMembers' }, schedule: { cron: '0 9 * * *', missedFirePolicy: 'skip' } },
    { id: 'trg_request', type: 'db-change', enabled: true, target: { kind: 'workflow', name: 'on-request' }, dbChange: { collection: 'MemberRequest', actions: ['create'] } }
  ]
};
const LATER = { id: 'trg_later', type: 'schedule', enabled: true, target: { kind: 'function', name: 'myStanding' }, schedule: { cron: '0 8 * * 1', missedFirePolicy: 'skip' } };

if (!fs.existsSync(MEMBERS)) ok(false, `the members-area template is at ${MEMBERS}`);
else {
  const { default: puppeteer } = await import('puppeteer-core');
  const { createEditor, serve } = await import('../server.mjs');
  const c = makeCopy(MEMBERS, 'triggers');
  fs.writeFileSync(path.join(c.copy, 'nodegx.automations.json'), JSON.stringify(AUTOMATIONS, null, 2) + '\n');
  const shots = path.resolve(process.argv[2] ?? c.work);
  fs.mkdirSync(shots, { recursive: true });
  const port = await freePort();
  const be = await startBackend(c, port);
  const base = `http://127.0.0.1:${port}`;
  const admin = adminClient(base, c.token);
  let server, browser;
  try {
    const seeded = (await admin('/admin/triggers')).triggers ?? [];
    ok(['trg_daily', 'trg_request'].every((id) => seeded.some((t) => t.id === id)), 'the backend started from the copy has the file’s two triggers', seeded.map((t) => t.id));
    const made = await admin('/admin/triggers', { method: 'POST', body: JSON.stringify({ type: 'webhook', name: 'Leave by link', enabled: true, target: { kind: 'function', name: 'unsubscribe' }, webhook: { slug: 'leave' } }) });
    const hookId = made.trigger?.id;
    ok(!!hookId, 'a trigger is made on the backend only', made);
    fs.writeFileSync(path.join(c.copy, 'nodegx.automations.json'), JSON.stringify({ ...AUTOMATIONS, triggers: [...AUTOMATIONS.triggers, LATER] }, null, 2) + '\n');
    const fired = await admin('/admin/triggers/trg_daily/fire', { method: 'POST', body: '{}' });
    const daily = ((await admin('/admin/triggers')).triggers ?? []).find((t) => t.id === 'trg_daily');

    server = await serve(createEditor({ project: c.copy, backend: base, token: c.token }), 0);
    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.__map?.map && window.__map.nodes.length > 0, { timeout: 30000 });
    await page.screenshot({ path: path.join(shots, 'bko-005-map-triggers.png') });

    const blocks = await page.evaluate(() => window.__map.nodes.filter((n) => n.kind === 'trigger').map((n) => ({ id: n.key, x: n.x, y: n.y })));
    ok(['trg_daily', 'trg_request', 'trg_later', hookId].every((id) => blocks.some((b) => b.id === id)) && blocks.length === 4, 'a block for each trigger: the two seeded, the file-only one, the backend-only one', blocks);
    const screensX = await page.evaluate(() => [...new Set(window.__map.nodes.filter((n) => n.kind === 'screen').map((n) => n.x))]);
    const lowestScreen = await page.evaluate(() => Math.max(...window.__map.nodes.filter((n) => n.kind === 'screen').map((n) => n.y)));
    ok(blocks.every((b) => screensX.includes(b.x) && b.y > lowestScreen), 'the triggers sit under the screens, in their column', { blocks, screensX, lowestScreen });

    const words = await page.evaluate(() => window.__canvasWords());
    const line = (start) => words.find((w) => w.startsWith(start));
    ok(daily?.scheduleWords && line('Morning news')?.includes(`last ran`) , 'the named schedule shows its name, and its last run once fired', { line: line('Morning news'), fired });
    ok(!!line('A new Member Request — has not run yet'), 'a row change with no name of its own is titled in short words: “A new Member Request”', words.filter((w) => /Member Request|Webhook|Schedule/.test(w)));
    // the backend never saw it, so it has no words for its schedule: the map says the cron, and never glosses one
    ok(line('Schedule 0 8 * * 1')?.endsWith('not on the backend yet'), 'the file-only trigger says “not on the backend yet”', words);

    const edges = await page.evaluate(() => window.__map.edges.filter((e) => e.kind === 'fires' || e.kind === 'watches').map((e) => e.id).sort());
    const want = ['g:trg_daily>f:notifyMembers', 'g:trg_request>f:decideMembership', 'g:trg_request>f:notifyMembers', 'g:trg_request>t:MemberRequest', 'g:trg_later>f:myStanding', `g:${hookId}>f:unsubscribe`];
    ok(want.every((id) => edges.includes(id)) && edges.length === want.length, 'each trigger is wired to the functions it runs, and the row change to its table', { edges, want });

    const panel = async (id) => {
      await page.evaluate((id) => {
        const s = window.__map, n = s.byId[id];
        const at = [n.x * s.cam.z + s.cam.x + 30, (n.y + n.h / 2) * s.cam.z + s.cam.y];
        document.getElementById('map').dispatchEvent(new PointerEvent('pointerdown', { clientX: at[0], clientY: at[1], pointerId: 1, bubbles: true }));
        document.getElementById('map').dispatchEvent(new PointerEvent('pointerup', { clientX: at[0], clientY: at[1], pointerId: 1, bubbles: true }));
      }, id);
      await page.waitForFunction((id) => document.getElementById('panelBody').dataset.node === id, { timeout: 5000 }).catch(() => {});
      return page.$eval('#panelBody', (e) => e.innerText);
    };
    const req = await panel('g:trg_request');
    ok(/When a row of Member Request is made\./.test(req) && /Answer a request/.test(req) && /2 steps/.test(req) && /decideMembership/.test(req) && /notifyMembers/.test(req) && /Member Request/.test(req), 'the row change’s panel: its workflow, its two steps’ functions, the table that starts it', req);
    ok(/counts as the app/.test(req), 'a run the app starts counts as the app (SCHEDULEAUTH)', req);
    await page.screenshot({ path: path.join(shots, 'bko-005-map-trigger-panel.png') });
    const hook = await panel(`g:${hookId}`);
    ok(/Only on the backend/.test(hook) && /counts as a visitor/.test(hook), 'the backend-only webhook: missing from the files, and its sender a visitor', hook);
    const later = await panel('g:trg_later');
    ok(/Not on the backend yet/.test(later) && /myStanding/.test(later), 'the file-only one: not on the backend yet, and what it runs', later);
    const notify = await panel('f:notifyMembers');
    ok(/Morning news|every day|09:00/i.test(notify) && /Answer a request/.test(notify) && !/doesn’t start it by itself/.test(notify), 'a function’s panel names the triggers that run it, the workflow’s among them', notify);
    const control = await panel('f:claimAssociation');
    // the control: a screen asks for it, nothing the backend starts runs it
    ok(/On Setup/.test(control) && !/Morning news|Answer a request|On the schedule|webhook/i.test(control), 'a function no trigger runs lists only the screen that asks for it (the control)', control);
    ok(await page.$eval('#legendFires', (e) => !e.hidden), 'the legend says what a yellow wire is');
    ok(!errors.length, 'no page error', errors);
  } catch (e) {
    ok(false, 'the drive ran to the end', e.stack);
  } finally {
    await browser?.close();
    server?.close();
    await stop(be);
  }
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
