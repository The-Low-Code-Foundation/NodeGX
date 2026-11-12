#!/usr/bin/env node
/**
 * PREPARE AN EMPTY PRODUCTION BACKEND (DBU-12). Through the tunnel, never a public admin route.
 *
 *   NODEGX_ADMIN_TOKEN=… node tools/setup-production.mjs --backend http://127.0.0.1:18695 \
 *     --coach-email <the coach's sign-in address> --coach-name "<First Last>" \
 *     [--coach-mail <where learner messages go>] [--display-name <name learners see>]
 *
 * setup-backend's first half without the example world:
 *   1. REFUSE a backend holding any user or any row in our tables (this is not how you redeploy).
 *   2. Apply backend/schema.json, and read it back.
 *   3. Replace the policy with nodegx.security.json and read it back; the file limits (50 MB, no SVG).
 *   4. The three schedules (nodegx.automations.json): provision.sh's --project-dir seeds them on the first
 *      start; each one missing is created here, and all three are read back enabled.
 *   5. The `staff` and `learner` roles (addLearner assigns `learner` and never creates it; roster lists it),
 *      the coach's account (no password: magic links) and its role.
 *   6. Settings: coachEmail (default: the sign-in address) and coachName (default: the first name).
 *   7. The nightly NodeGX backup: 03:15 (the box's TZ, Europe/Paris), seven kept, in <data dir>/backups.
 *      hosting/offsite-backup.sh moves the newest one off the box at 03:45 UTC.
 * Then setup-signin.mjs (mail, magic links, the origin) and check-production.mjs.
 */
import { adminClient } from './lib/admin-client.mjs';
import { BACKEND, arg, readJson, token } from './lib/local.mjs';

const COACH_EMAIL = String(arg('coach-email') || '').trim().toLowerCase();
const COACH_NAME = String(arg('coach-name') || '').trim();
const COACH_MAIL = String(arg('coach-mail') || COACH_EMAIL).trim().toLowerCase();
const DISPLAY = String(arg('display-name') || COACH_NAME.split(' ')[0] || '').trim();
const looksLikeEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
if (!looksLikeEmail(COACH_EMAIL) || !COACH_NAME || !looksLikeEmail(COACH_MAIL)) {
  console.error('setup-production: --coach-email and --coach-name are required (and --coach-mail must be an address).');
  process.exit(2);
}
if (/@example\.(com|test)$/.test(COACH_EMAIL) || /@example\.(com|test)$/.test(COACH_MAIL)) {
  console.error('setup-production: an @example address is the example world, not a real coach.');
  process.exit(2);
}

const schema = readJson('backend', 'schema.json');
const policy = readJson('nodegx.security.json');
const automations = readJson('nodegx.automations.json');
const api = adminClient(BACKEND, token());
const { call, data } = api;

// 1
try {
  await api.refuseOccupied(schema, 'setup-production');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// 2
const applied = await call('POST', '/admin/schema/apply', { source: { tables: schema.tables } });
const skipped = (applied.result && applied.result.skipped) || [];
if (skipped.length) throw new Error(`schema apply skipped: ${skipped.join('; ')}`);
await api.assertSchema(schema);

// 3
await call('PUT', '/admin/permissions', policy);
const live = (await call('GET', '/admin/permissions')).config;
if (JSON.stringify(live) !== JSON.stringify(policy)) throw new Error('the live policy is not nodegx.security.json after PUT');
const FILE_LIMITS = { maxUploadBytes: 50 * 1024 * 1024, contentTypes: { allowList: null, denyList: ['image/svg+xml'] } };
await call('PUT', '/admin/files/config', FILE_LIMITS);
const limits = (await call('GET', '/admin/files/config'));
const lim = limits.config || limits;
if (lim.maxUploadBytes !== FILE_LIMITS.maxUploadBytes || !(lim.contentTypes?.denyList || []).includes('image/svg+xml')) {
  throw new Error('the file limits did not hold after PUT');
}

// 4
const listTriggers = async () => {
  const r = await call('GET', '/admin/triggers');
  return r.triggers || r.items || r.result || r;
};
let triggers = await listTriggers();
for (const t of automations.triggers) {
  if (!(Array.isArray(triggers) && triggers.some((x) => x.id === t.id))) await call('POST', '/admin/triggers', t);
}
triggers = await listTriggers();
const missingTriggers = automations.triggers.filter((t) => !triggers.some((x) => x.id === t.id && x.enabled !== false));
if (missingTriggers.length) throw new Error(`schedules missing or off: ${missingTriggers.map((t) => t.id).join(', ')}`);

// 5
for (const name of ['staff', 'learner']) await call('POST', '/admin/roles', { name });
const coach = await data('POST', '/classes/_User', { username: COACH_EMAIL, email: COACH_EMAIL, name: COACH_NAME, jobTitle: 'Coach', timezone: 'Europe/Paris' });
await call('POST', '/admin/roles/staff/users', { userId: coach.objectId });

// 6
await data('POST', '/classes/Setting', { key: 'coachEmail', value: COACH_MAIL });
await data('POST', '/classes/Setting', { key: 'coachName', value: DISPLAY });

// 7
const BACKUPS = { schedule: { enabled: true, cron: '15 3 * * *', missedFirePolicy: 'run-once-on-start' }, retention: { keepLast: 7, keepDaily: 0, keepWeekly: 0 } };
await call('PUT', '/admin/backups/config', BACKUPS);
const bk = await call('GET', '/admin/backups');
const bkSchedule = (bk.config || bk).schedule || {};
if (!bkSchedule.enabled || bkSchedule.cron !== BACKUPS.schedule.cron) throw new Error(`the nightly backup did not hold after PUT: ${JSON.stringify(bk).slice(0, 200)}`);

console.log(
  `setup-production: ${schema.tables.length} tables and the policy read back; file limits; ${automations.triggers.length} schedules on; ` +
    `the staff and learner roles; the coach's account (staff); Settings: learners see "${DISPLAY}", messages go to the address given; the nightly backup (03:15, seven kept). Next: setup-signin, then check-production.`
);
