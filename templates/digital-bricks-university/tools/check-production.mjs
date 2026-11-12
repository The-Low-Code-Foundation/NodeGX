#!/usr/bin/env node
/**
 * IS PRODUCTION WHAT WE SAY IT IS? (DBU-12)
 *
 *   NODEGX_ADMIN_TOKEN=… node tools/check-production.mjs --backend http://127.0.0.1:18695 \
 *     --origin https://training.digitalbricks.io [--no-public]
 *
 * Read-only on everything real, with ONE throwaway learner made and removed again:
 *   CONFIGURATION  the policy is nodegx.security.json; the schema is backend/schema.json; magic links on, no
 *                  sign-up, the allow-list is the origin and nothing else; mail through a real relay (not a
 *                  local catcher), from a real address, with links built on the origin; appUrl is the origin;
 *                  unsubscribeKey exists; the three schedules are on; the staff and learner roles
 *                  exist; the coach's settings are real.
 *   NO EXAMPLE WORLD  no @example account, and none of the fixtures' rows (their ids are readable keys).
 *   A THROWAWAY LEARNER  made by the admin, given a session: learnerHome and myPlan answer as for anyone new,
 *                  the coach's roster answers, a learner calling a staff function is refused, signed out is
 *                  refused. Then the account, its sessions and any row naming it are deleted, and counted gone.
 *   THE PUBLIC NAME (unless --no-public)  / is the app over HTTPS; /health answers; /admin, /_admin,
 *                  /executions and /metrics are 404; /files/* carries the sandbox CSP and nosniff (PLATFORM D2);
 *                  coachName answers the coach's name and nothing else.
 */
import { randomBytes } from 'node:crypto';
import { adminClient } from './lib/admin-client.mjs';
import { BACKEND, arg, has, readJson, token } from './lib/local.mjs';

const ORIGIN = String(arg('origin') || '').replace(/\/$/, '');
if (!/^https:\/\/[^/]+$/.test(ORIGIN)) {
  console.error('check-production: --origin https://<host> is required.');
  process.exit(2);
}
const api = adminClient(BACKEND, token());
const { call, data } = api;
const results = [];
const expect = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });
const tables = readJson('backend', 'schema.json').tables;

// ── configuration ──────────────────────────────────────────────────────────
const policy = (await call('GET', '/admin/permissions')).config;
expect('policy: exactly nodegx.security.json', JSON.stringify(policy) === JSON.stringify(readJson('nodegx.security.json')));
try {
  await api.assertSchema(readJson('backend', 'schema.json'));
  expect('schema: every table and column of backend/schema.json', true);
} catch (e) {
  expect('schema: every table and column of backend/schema.json', false, e.message);
}
const auth = await call('GET', '/admin/auth');
const ap = auth.policy || auth;
const magic = ap.magicLink || (auth.config && auth.config.magicLink) || {};
const allow = ap.redirectAllowList || (auth.config && auth.config.redirectAllowList) || [];
expect('sign-in: magic links on, no sign-up', magic.enabled === true && magic.allowSignup === false);
expect('sign-in: the allow-list is the origin and nothing else', JSON.stringify(allow) === JSON.stringify([ORIGIN]), JSON.stringify(allow));
expect('sign-in: the backend reports magic links ready', auth.magicLinkReady !== false);
const email = await call('GET', '/admin/email/config');
const ec = email.config || email;
const relay = (ec.smtp && ec.smtp.host) || '';
expect('mail: a real relay, not a local catcher', ec.enabled === true && relay && !/^(127\.|localhost|0\.0\.0\.0|mailpit)/.test(relay), relay);
expect('mail: from a real address', /@/.test(ec.fromAddress || '') && !/@example\./.test(ec.fromAddress || ''), ec.fromAddress);
expect('mail: links are built on the origin', String(ec.baseUrl || '').replace(/\/$/, '') === ORIGIN, ec.baseUrl);
const secrets = JSON.stringify(await call('GET', '/admin/secrets'));
expect('secrets: appUrl and unsubscribeKey are set', secrets.includes('appUrl') && secrets.includes('unsubscribeKey'));
const tr = await call('GET', '/admin/triggers');
const trList = tr.triggers || tr.items || tr.result || tr;
for (const id of ['mail-waiting-messages', 'morning-round', 'send-checkins']) {
  expect(`schedule ${id} is on`, Array.isArray(trList) && trList.some((t) => t.id === id && t.enabled !== false));
}
const bk = await call('GET', '/admin/backups');
const bkSchedule = (bk.config || bk).schedule || {};
expect('backups: the nightly NodeGX backup is on', bkSchedule.enabled === true && !!bkSchedule.cron, JSON.stringify(bkSchedule));
const rolesRes = await call('GET', '/admin/roles');
const roleList = (rolesRes.roles || rolesRes.items || rolesRes.result || rolesRes || []).map((r) => r.name || r);
expect('roles: staff and learner exist', ['staff', 'learner'].every((n) => roleList.includes(n)), JSON.stringify(roleList));
const settings = await api.all('Setting');
const setting = (k) => (settings.find((s) => s.key === k) || {}).value || '';
expect('Settings: learner messages go to a real address', /@/.test(setting('coachEmail')) && !/@example\./.test(setting('coachEmail')));
expect('Settings: learners see a name', setting('coachName').trim().length > 0);

// ── no example world ───────────────────────────────────────────────────────
const users = await api.all('_User');
expect('no @example account', !users.some((u) => /@example\.(com|test)$/.test(String(u.email || u.username || ''))), String(users.length));
const fixtureRows = [];
for (const c of ['LibraryItem', 'PlanTemplate', 'Plan', 'Step', 'Message']) {
  for (const r of await api.all(c)) if (/^(lib-|tpl-|plan-|step-|msg-)[a-z]/.test(r.objectId)) fixtureRows.push(`${c}/${r.objectId}`);
}
expect('none of the fixtures\' rows', !fixtureRows.length, fixtureRows.slice(0, 3).join(', '));

// ── a throwaway learner, made and removed ──────────────────────────────────
const stamp = randomBytes(4).toString('hex');
const address = `check-production-${stamp}@example.com`;
const throwaway = await data('POST', '/classes/_User', { username: address, email: address, name: `Check Production ${stamp}`, timezone: 'Europe/Paris' });
const coachUser = users.find((u) => !/@example\./.test(String(u.email || '')));
const sessions = [];
const fn = async (session, name, body = {}) => {
  const r = await fetch(`${BACKEND}/functions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(session ? { 'X-Parse-Session-Token': session.token } : {}) },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: r.status, ok: r.ok, json, text };
};
try {
  const me = await api.sessionFor(throwaway.objectId, 'check-production');
  sessions.push(me);
  const home = await fn(me, 'learnerHome');
  expect('throwaway learner: learnerHome answers', home.ok, `${home.status} ${home.text.slice(0, 120)}`);
  const plan = await fn(me, 'myPlan');
  expect('throwaway learner: myPlan answers', plan.ok, `${plan.status} ${plan.text.slice(0, 120)}`);
  const sneaky = await fn(me, 'roster');
  expect('throwaway learner: a staff function (roster) is refused', sneaky.status === 403 || sneaky.status === 401, String(sneaky.status));
  const nobody = await fn(null, 'learnerHome');
  expect('signed out: learnerHome is refused', nobody.status === 401 || nobody.status === 403, String(nobody.status));
  if (coachUser) {
    const coach = await api.sessionFor(coachUser.objectId, 'check-production');
    sessions.push(coach);
    const roster = await fn(coach, 'roster');
    expect('the coach: roster answers', roster.ok, `${roster.status} ${roster.text.slice(0, 120)}`);
    const inbox = await fn(coach, 'coachInbox', { countOnly: true });
    expect('the coach: coachInbox answers', inbox.ok, `${inbox.status} ${inbox.text.slice(0, 120)}`);
  } else {
    expect('the coach: an account to check with', false, 'no non-example account');
  }
} finally {
  for (const s of sessions) await api.endSession(s).catch(() => {});
  let left = 0;
  for (const t of tables.map((x) => x.name)) {
    if (!['Plan', 'Step', 'Message', 'Submission', 'Creation', 'Doorbell', 'QuietFlag', 'CheckinResponse', 'CoachNote'].includes(t)) continue;
    for (const r of await api.all(t)) {
      if (r.learner === throwaway.objectId || (r.learner && r.learner.objectId === throwaway.objectId)) {
        await data('DELETE', `/classes/${t}/${r.objectId}`);
      }
    }
  }
  await data('DELETE', `/classes/_User/${throwaway.objectId}`);
  for (const t of ['Plan', 'Doorbell', 'QuietFlag']) {
    for (const r of await api.all(t).catch(() => [])) if (r.learner === throwaway.objectId) left++;
  }
  left += (await api.all('_User')).filter((u) => u.objectId === throwaway.objectId).length;
  expect('the throwaway learner and everything naming it are gone', left === 0, String(left));
}

// ── the public name ────────────────────────────────────────────────────────
if (!has('no-public')) {
  const get = async (path, init) => {
    try {
      const r = await fetch(ORIGIN + path, { redirect: 'manual', ...init });
      return { status: r.status, headers: r.headers, text: await r.text() };
    } catch (e) {
      return { status: 0, headers: new Headers(), text: String(e.message || e) };
    }
  };
  const root = await get('/');
  expect('public: / is the app over HTTPS', root.status === 200 && /noodl|nodegx/i.test(root.text), String(root.status));
  const deep = await get('/coach/inbox');
  expect('public: a deep link falls back to the app', deep.status === 200 && /noodl|nodegx/i.test(deep.text), String(deep.status));
  const health = await get('/health');
  expect('public: /health answers', health.status === 200, String(health.status));
  for (const p of ['/admin/permissions', '/_admin', '/executions', '/metrics']) {
    const r = await get(p);
    expect(`public: ${p} is 404`, r.status === 404, String(r.status));
  }
  const file = await get('/files/check-production-none');
  const csp = file.headers.get('content-security-policy') || '';
  expect('public: /files/* is a sandboxed document, never sniffed', /sandbox/.test(csp) && file.headers.get('x-content-type-options') === 'nosniff', `${file.status} ${csp}`);
  const name = await get('/functions/coachName', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  let keys = [];
  try { keys = Object.keys(JSON.parse(name.text).result || {}); } catch { keys = []; }
  expect('public: coachName answers the name and nothing else', name.status === 200 && keys.join() === 'name' && !name.text.includes('@'), `${name.status} ${name.text.slice(0, 80)}`);
}

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok || !r.detail ? '' : `  (${r.detail})`}`);
console.log(`check-production: ${results.length - failed.length} of ${results.length} ok${failed.length ? `, ${failed.length} FAILED` : ''} (${ORIGIN}).`);
process.exit(failed.length ? 1 : 0);
