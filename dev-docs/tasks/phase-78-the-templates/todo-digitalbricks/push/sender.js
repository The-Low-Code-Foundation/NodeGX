#!/usr/bin/env node
/**
 * todo-push — deadline reminders for todo.digitalbricks.io.
 *
 * Once a minute: for every enabled PushSubscription, if it is between 09:00 and 12:00 in THAT device's
 * time zone and this device has not been reminded today, send one notification naming the person's
 * open tasks whose deadline is today. The three hours are catch-up for a server that was down at 9;
 * nothing goes out later than that, so turning reminders on at 10pm does not fire at once. A device
 * with nothing due is marked done for the day too.
 *
 * Reads the backend's SQLite file READ-ONLY and never writes it; what it has sent lives in its own
 * state file. A subscription the push service says is gone (404/410) is remembered as dead.
 *
 *   node sender.js                      run the loop (systemd todo-push)
 *   node sender.js --generate-keys      write the VAPID key pair if absent; print the public key
 *   node sender.js --public-key         print the public key
 *   node sender.js --dry-run            print what a tick would send now, send nothing
 *   node sender.js --once [--only <email>]   one real tick, then exit
 *   node sender.js --test <email|all>   send a test notification to that person's devices now
 *
 * Environment: TODO_DB, TODO_VAPID, TODO_PUSH_STATE, TODO_VAPID_SUBJECT, TODO_REMIND_HOUR (9),
 * TODO_REMIND_WINDOW_HOURS (3).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const webpush = require('./web-push.bundle.js');

const DB = process.env.TODO_DB || '/var/lib/todo/data/data/local.db';
const KEYS = process.env.TODO_VAPID || '/etc/todo-push/vapid.json';
const STATE = process.env.TODO_PUSH_STATE || '/var/lib/todo/push-state.json';
const SUBJECT = process.env.TODO_VAPID_SUBJECT || 'mailto:richard@digitalbricks.io';
const HOUR = Number(process.env.TODO_REMIND_HOUR || 9);
const WINDOW_HOURS = Number(process.env.TODO_REMIND_WINDOW_HOURS || 3);
const TICK_MS = 60_000;

const log = (event, fields = {}) => console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(file, value, mode) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: mode || 0o600 });
  fs.renameSync(tmp, file);
}

/** The date (YYYY-MM-DD) and hour it is right now in a time zone; UTC when the zone is not one. */
function localNow(timeZone, now = new Date()) {
  let zone = timeZone;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
  } catch {
    zone = 'UTC';
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), zone };
}

/** Is this the hour a reminder may go out? */
function inWindow(hour) {
  return hour >= HOUR && hour < HOUR + WINDOW_HOURS;
}

function openDb() {
  return new DatabaseSync(DB, { readOnly: true });
}

function hasTable(db, name) {
  return !!db.prepare("select 1 from sqlite_master where type='table' and name=?").get(name);
}

function enabled(value) {
  return !(value === 0 || value === '0' || value === false || value === 'false' || value === null);
}

function subscriptions(db) {
  if (!hasTable(db, 'PushSubscription')) return [];
  const cols = db.prepare('pragma table_info("PushSubscription")').all().map((c) => c.name);
  if (!['owner', 'endpoint', 'p256dh', 'auth'].every((c) => cols.includes(c))) return [];
  return db
    .prepare('select * from "PushSubscription"')
    .all()
    .filter((r) => r.endpoint && r.p256dh && r.auth && r.owner && enabled(cols.includes('enabled') ? r.enabled : true));
}

function ownersNamed(db, who) {
  if (!who || who === 'all') return null;
  return new Set(
    db
      .prepare('select objectId, username, email from "_User"')
      .all()
      .filter((u) => u.username === who || u.email === who)
      .map((u) => u.objectId)
  );
}

function dueToday(db, owner, date) {
  if (!hasTable(db, 'Task')) return [];
  return db
    .prepare('select title from "Task" where owner = ? and deadline = ? and (status is null or status != ?) order by position')
    .all(owner, date, 'done')
    .map((t) => String(t.title || 'Untitled'));
}

function message(titles, date) {
  const title = titles.length === 1 ? 'Due today' : `${titles.length} tasks due today`;
  const body = titles.length === 1 ? titles[0] : titles.slice(0, 4).join('\n') + (titles.length > 4 ? `\n+${titles.length - 4} more` : '');
  return { title, body, tag: `todo-due-${date}`, url: '/todo-list' };
}

function keys() {
  const k = readJson(KEYS, null);
  if (!k || !k.publicKey || !k.privateKey) throw new Error(`no VAPID keys at ${KEYS} (run --generate-keys)`);
  return k;
}

async function send(sub, payload) {
  const k = keys();
  return webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload),
    { TTL: 6 * 3600, urgency: 'normal', vapidDetails: { subject: SUBJECT, publicKey: k.publicKey, privateKey: k.privateKey } }
  );
}

async function tick({ dryRun = false, only = null } = {}) {
  const state = readJson(STATE, { remindedOn: {}, dead: {} });
  state.remindedOn = state.remindedOn || {};
  state.dead = state.dead || {};
  let db;
  try {
    db = openDb();
  } catch (e) {
    log('db.unavailable', { detail: String(e.message) });
    return { sent: 0 };
  }
  let changed = false;
  let sent = 0;
  try {
    const owners = ownersNamed(db, only);
    for (const sub of subscriptions(db)) {
      if (owners && !owners.has(sub.owner)) continue;
      if (state.dead[sub.endpoint]) continue;
      const now = localNow(sub.timeZone);
      if (!inWindow(now.hour) || state.remindedOn[sub.objectId] === now.date) continue;
      const titles = dueToday(db, sub.owner, now.date);
      if (dryRun) {
        log('dry-run', { subscription: sub.objectId, zone: now.zone, date: now.date, due: titles });
        continue;
      }
      if (titles.length > 0) {
        try {
          const res = await send(sub, message(titles, now.date));
          sent++;
          log('sent', { subscription: sub.objectId, zone: now.zone, date: now.date, due: titles.length, status: res.statusCode });
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) {
            state.dead[sub.endpoint] = new Date().toISOString();
            changed = true;
            log('subscription.gone', { subscription: sub.objectId, status: e.statusCode });
          } else {
            log('send.failed', { subscription: sub.objectId, status: e.statusCode, detail: String(e.body || e.message).slice(0, 200) });
          }
          continue; // not marked: the next tick tries again
        }
      }
      state.remindedOn[sub.objectId] = now.date;
      changed = true;
    }
  } finally {
    db.close();
  }
  if (changed && !dryRun) writeJsonAtomic(STATE, state);
  return { sent };
}

function flag(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

async function main(argv) {
  if (argv.includes('--generate-keys')) {
    if (!fs.existsSync(KEYS)) {
      fs.mkdirSync(path.dirname(KEYS), { recursive: true });
      writeJsonAtomic(KEYS, webpush.generateVAPIDKeys(), 0o600);
      log('keys.generated', { file: KEYS });
    }
    console.log(keys().publicKey);
    return;
  }
  if (argv.includes('--public-key')) {
    console.log(keys().publicKey);
    return;
  }
  if (argv.includes('--dry-run')) {
    await tick({ dryRun: true, only: flag(argv, '--only') });
    return;
  }
  if (argv.includes('--once')) {
    const { sent } = await tick({ only: flag(argv, '--only') });
    log('once.done', { sent });
    return;
  }
  if (argv.includes('--test')) {
    const who = flag(argv, '--test');
    if (!who) throw new Error('--test needs an email (username) or "all"');
    const db = openDb();
    try {
      const owners = ownersNamed(db, who);
      const subs = subscriptions(db).filter((s) => !owners || owners.has(s.owner));
      if (subs.length === 0) log('test.none', { who });
      for (const s of subs) {
        try {
          const res = await send(s, { title: 'Todo list', body: 'Reminders are working. Deadlines arrive here at 9am on the day.', tag: 'todo-test', url: '/todo-list' });
          log('test.sent', { subscription: s.objectId, status: res.statusCode });
        } catch (e) {
          log('test.failed', { subscription: s.objectId, status: e.statusCode, detail: String(e.body || e.message).slice(0, 200) });
        }
      }
    } finally {
      db.close();
    }
    return;
  }

  keys(); // refuse to start without them
  log('started', { db: DB, hour: HOUR, windowHours: WINDOW_HOURS });
  const loop = async () => {
    try {
      await tick();
    } catch (e) {
      log('tick.failed', { detail: String((e && e.stack) || e).slice(0, 400) });
    }
  };
  await loop();
  setInterval(loop, TICK_MS);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(String((e && e.message) || e));
    process.exit(1);
  });
}

module.exports = { localNow, inWindow, message, dueToday, subscriptions, tick };
