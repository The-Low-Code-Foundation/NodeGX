#!/usr/bin/env node
/**
 * todo-push — deadline reminders, and the times of things that repeat, for todo.digitalbricks.io.
 *
 * Once a minute: for every enabled PushSubscription, if it is between 09:00 and 12:00 in THAT device's
 * time zone and this device has not been reminded today, send one notification naming the person's
 * open tasks whose deadline is today. The three hours are catch-up for a server that was down at 9;
 * nothing goes out later than that, so turning reminders on at 10pm does not fire at once. A device
 * with nothing due is marked done for the day too.
 *
 * TPL-008-RC (RC5): and for every one of the person's `Routine` rows with a slot today in THAT device's
 * time zone, one notification at the slot's time — sent once per device and slot, within
 * TODO_ROUTINE_WINDOW_MINUTES (60) of it, and not at all once that occurrence has a `RoutineCheck`.
 * Which days a routine falls on is decided by SCHEDULE_FNS below, the template's own block, byte for
 * byte (`tpl008Template.test.ts` fails when they differ).
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
 * TODO_REMIND_WINDOW_HOURS (3), TODO_ROUTINE_WINDOW_MINUTES (60).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

// Loaded when a notification is sent, not before: the schedule and the queries below are graded in
// the repo, where the bundle is not (it is built on the box — see BUNDLE.txt).
let webpushModule = null;
const webpush = () => webpushModule || (webpushModule = require('./web-push.bundle.js'));

const DB = process.env.TODO_DB || '/var/lib/todo/data/data/local.db';
const KEYS = process.env.TODO_VAPID || '/etc/todo-push/vapid.json';
const STATE = process.env.TODO_PUSH_STATE || '/var/lib/todo/push-state.json';
const SUBJECT = process.env.TODO_VAPID_SUBJECT || 'mailto:richard@digitalbricks.io';
const HOUR = Number(process.env.TODO_REMIND_HOUR || 9);
const WINDOW_HOURS = Number(process.env.TODO_REMIND_WINDOW_HOURS || 3);
const ROUTINE_WINDOW_MINUTES = Number(process.env.TODO_ROUTINE_WINDOW_MINUTES || 60);
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

/** The date (YYYY-MM-DD), hour and minute it is right now in a time zone; UTC when the zone is not one. */
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
      minute: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute), zone };
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

// ── BEGIN SCHEDULE_FNS — packages/noodl-mcp/tests/tpl008Components.ts, byte for byte. Do not edit here.
var SCHED_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
var SCHED_WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
var SCHED_NAMES = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
function schedPad(n) { return (n < 10 ? '0' : '') + n; }
function schedIso(d) { return d.getFullYear() + '-' + schedPad(d.getMonth() + 1) + '-' + schedPad(d.getDate()); }
function schedDate(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return schedIso(d) === m[0] ? d : null;
}
function schedRank(day) {
  if (day === '') return 0;
  var w = SCHED_WEEK.indexOf(day);
  if (w >= 0) return w;
  return day === 'last' ? 32 : Number(day);
}
function schedSlots(cadence, text) {
  var out = [], seen = {};
  var parts = String(text || '').split(',');
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].replace(/\s+/g, '').toLowerCase();
    if (p === '') continue;
    var at = p.indexOf('@');
    var day = at >= 0 ? p.slice(0, at) : '';
    var time = at >= 0 ? p.slice(at + 1) : p;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) continue;
    if (cadence === 'daily') day = '';
    else if (cadence === 'weekly') {
      if (SCHED_WEEK.indexOf(day) < 0) continue;
    } else if (cadence === 'monthly') {
      if (day !== 'last') {
        if (!/^\d{1,2}$/.test(day) || Number(day) < 1 || Number(day) > 31) continue;
        day = String(Number(day));
      }
    } else continue;
    var key = day === '' ? time : day + '@' + time;
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ day: day, time: time, key: key });
  }
  out.sort(function (a, b) { return schedRank(a.day) - schedRank(b.day) || (a.time < b.time ? -1 : a.time > b.time ? 1 : 0); });
  return out;
}
function schedJoin(slots) {
  var keys = [];
  for (var i = 0; i < slots.length; i++) keys.push(slots[i].key);
  return keys.join(',');
}
function schedStopDay(r) {
  if (!r || r.status !== 'stopped') return null;
  var s = r.stoppedAt ? new Date(r.stoppedAt) : null;
  if (!s || isNaN(s.getTime())) return new Date(0);
  s.setHours(0, 0, 0, 0);
  return s;
}
function schedOn(r, d) {
  if (!r) return [];
  var day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var start = schedDate(r.startDate), end = schedDate(r.endDate), stop = schedStopDay(r);
  if (start && day < start) return [];
  if (end && day > end) return [];
  if (stop && day >= stop) return [];
  var last = new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate();
  var slots = schedSlots(r.cadence, r.slots), out = [], seen = {};
  for (var i = 0; i < slots.length; i++) {
    var s = slots[i], hit = false;
    if (s.day === '') hit = true;
    else if (SCHED_WEEK.indexOf(s.day) >= 0) hit = SCHED_DAYS[day.getDay()] === s.day;
    else if (s.day === 'last') hit = day.getDate() === last;
    else hit = Math.min(Number(s.day), last) === day.getDate();
    if (hit && !seen[s.time]) {
      seen[s.time] = true;
      out.push(s.time);
    }
  }
  out.sort();
  return out;
}
function schedOrdinal(n) {
  var t = n % 100, u = n % 10;
  return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th');
}
function schedAnd(list) {
  return list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}
function schedDayName(cadence, day) {
  if (cadence === 'weekly') return SCHED_NAMES[day];
  return day === 'last' ? 'the last day' : 'the ' + schedOrdinal(Number(day));
}
function schedSlotLabel(cadence, s) {
  if (cadence === 'weekly') return SCHED_NAMES[s.day] + ' ' + s.time;
  if (cadence === 'monthly') return (s.day === 'last' ? 'Last day' : schedOrdinal(Number(s.day))) + ' ' + s.time;
  return s.time;
}
function schedDescribe(r) {
  var cadence = String((r && r.cadence) || '');
  var slots = schedSlots(cadence, r && r.slots);
  if (slots.length === 0) return 'No times yet';
  var i, k;
  if (cadence === 'daily') {
    var times = [];
    for (i = 0; i < slots.length; i++) times.push(slots[i].time);
    return 'Every day at ' + schedAnd(times);
  }
  var byDay = {}, order = [];
  for (i = 0; i < slots.length; i++) {
    if (!byDay[slots[i].day]) {
      byDay[slots[i].day] = [];
      order.push(slots[i].day);
    }
    byDay[slots[i].day].push(slots[i].time);
  }
  var same = true;
  for (k = 1; k < order.length; k++) if (byDay[order[k]].join() !== byDay[order[0]].join()) same = false;
  var lead = cadence === 'weekly' ? 'Every ' : 'Every month on ';
  var parts = [];
  if (same) {
    for (k = 0; k < order.length; k++) parts.push(schedDayName(cadence, order[k]));
    return lead + schedAnd(parts) + ' at ' + schedAnd(byDay[order[0]]);
  }
  for (k = 0; k < order.length; k++) parts.push(schedDayName(cadence, order[k]) + ' at ' + schedAnd(byDay[order[k]]));
  return lead + parts.join('; ');
}
function schedTime(text) {
  var t = String(text || '').trim().toLowerCase().replace(/\s+/g, '');
  var m = /^(\d{1,2})(?:[:.h]?(\d{2}))?(am|pm)?$/.exec(t);
  if (!m) return null;
  var h = Number(m[1]), min = m[2] ? Number(m[2]) : 0, ap = m[3] || '';
  if (min > 59) return null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    if (h === 12) h = 0;
    if (ap === 'pm') h += 12;
  }
  if (h > 23) return null;
  return schedPad(h) + ':' + schedPad(min);
}
// ── END SCHEDULE_FNS

function minutesOf(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
}

function routinesOf(db, owner) {
  if (!hasTable(db, 'Routine')) return [];
  return db.prepare('select * from "Routine" where owner = ?').all(owner);
}

function checked(db, routineId, date, time) {
  if (!hasTable(db, 'RoutineCheck')) return false;
  return !!db.prepare('select 1 from "RoutineCheck" where routineId = ? and date = ? and time = ? limit 1').get(routineId, date, time);
}

/**
 * RC5 — the occurrences of this person's routines to push to this device now: due today in the device's own
 * zone, within the window after their time, not yet sent to this device, and not ticked off.
 */
function routinesDue(db, owner, now, subscriptionId, sent) {
  const day = schedDate(now.date);
  if (!day) return [];
  const minute = now.hour * 60 + now.minute;
  const out = [];
  for (const r of routinesOf(db, owner)) {
    for (const time of schedOn(r, day)) {
      const at = minutesOf(time);
      if (minute < at || minute >= at + ROUTINE_WINDOW_MINUTES) continue;
      const key = `${subscriptionId}|${r.objectId}|${now.date}|${time}`;
      if (sent[key] || checked(db, r.objectId, now.date, time)) continue;
      out.push({ routine: r, time, key });
    }
  }
  return out;
}

function routineMessage(routine, time, date) {
  return {
    title: String(routine.title || 'Something that repeats'),
    body: `${time} · tick it off in Today`,
    tag: `todo-routine-${routine.objectId}-${date}-${time}`,
    url: '/?view=today'
  };
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
  return webpush().sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload),
    { TTL: 6 * 3600, urgency: 'normal', vapidDetails: { subject: SUBJECT, publicKey: k.publicKey, privateKey: k.privateKey } }
  );
}

async function tick({ dryRun = false, only = null } = {}) {
  const state = readJson(STATE, { remindedOn: {}, dead: {} });
  state.remindedOn = state.remindedOn || {};
  state.dead = state.dead || {};
  state.routineSent = state.routineSent || {};
  let db;
  try {
    db = openDb();
  } catch (e) {
    log('db.unavailable', { detail: String(e.message) });
    return { sent: 0 };
  }
  let changed = false;
  let sent = 0;
  // What was sent for a routine is kept three days — long enough for any time zone's today.
  const cutoff = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  for (const key of Object.keys(state.routineSent)) {
    if (state.routineSent[key] < cutoff) {
      delete state.routineSent[key];
      changed = true;
    }
  }
  try {
    const owners = ownersNamed(db, only);
    for (const sub of subscriptions(db)) {
      if (owners && !owners.has(sub.owner)) continue;
      if (state.dead[sub.endpoint]) continue;
      const now = localNow(sub.timeZone);

      // RC5 — things that repeat, each at its own time. Its own record of what went out: the 9am deadline
      // reminder has nothing to do with the 08:00 tablet.
      let gone = false;
      for (const due of routinesDue(db, sub.owner, now, sub.objectId, state.routineSent)) {
        if (dryRun) {
          log('dry-run.routine', { subscription: sub.objectId, zone: now.zone, date: now.date, routine: due.routine.objectId, time: due.time });
          continue;
        }
        try {
          const res = await send(sub, routineMessage(due.routine, due.time, now.date));
          sent++;
          log('sent.routine', { subscription: sub.objectId, zone: now.zone, date: now.date, routine: due.routine.objectId, time: due.time, status: res.statusCode });
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) {
            state.dead[sub.endpoint] = new Date().toISOString();
            changed = true;
            gone = true;
            log('subscription.gone', { subscription: sub.objectId, status: e.statusCode });
            break;
          }
          log('send.failed', { subscription: sub.objectId, routine: due.routine.objectId, status: e.statusCode, detail: String(e.body || e.message).slice(0, 200) });
          continue; // not marked: the next tick tries again, inside the window
        }
        state.routineSent[due.key] = now.date;
        changed = true;
      }
      if (gone) continue;

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
      writeJsonAtomic(KEYS, webpush().generateVAPIDKeys(), 0o600);
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

module.exports = { localNow, inWindow, message, dueToday, subscriptions, tick, routinesDue, routineMessage, SCHEDULE_FNS_MARKERS: ['// ── BEGIN SCHEDULE_FNS', '// ── END SCHEDULE_FNS'] };
