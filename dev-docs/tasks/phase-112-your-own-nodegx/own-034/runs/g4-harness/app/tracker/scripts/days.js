// OWN-034 harness block: the date logic, written once. The harness copies this file into the app as
// scripts/days.js, and every Function that needs a day, a streak or a count lists it under Uses (Scripts.days).
// Tested against the grader's frozen days by test-days.mjs before any model runs.
//
// A day is the person's local date, "YYYY-MM-DD", never a UTC date: a tick at nine in the evening west of
// Greenwich must not be filed under tomorrow. Ticks are kept per item as a list of day strings.
// Plain ES5 loops only: a for…of over an iterable runs zero times in the viewer.

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function dayKey(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function parseDay(key) {
  var p = String(key).split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12);
}

// Noon local time, so stepping over a clock change never lands on the wrong date.
function addDays(key, n) {
  var d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

function today() {
  return dayKey(new Date());
}

function has(ticks, key) {
  return !!ticks && ticks.indexOf(key) !== -1;
}

var LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// The last n days, oldest first, ending today: one cell each, with a stable id for the For Each.
function lastDays(ticks, todayKey, n) {
  var out = [];
  for (var back = n - 1; back >= 0; back--) {
    var key = addDays(todayKey, -back);
    out.push({ id: key, day: key, letter: LETTERS[parseDay(key).getDay()], date: String(parseDay(key).getDate()), done: has(ticks, key), isToday: back === 0 });
  }
  return out;
}

// Days in a row ending today, or ending yesterday while today is not ticked yet: an unticked morning does not break it.
function streak(ticks, todayKey) {
  var key = has(ticks, todayKey) ? todayKey : addDays(todayKey, -1);
  var n = 0;
  while (has(ticks, key)) {
    n++;
    key = addDays(key, -1);
  }
  return n;
}

function bestStreak(ticks) {
  if (!ticks || !ticks.length) return 0;
  var sorted = ticks.slice().sort();
  var best = 1, run = 1;
  for (var i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]) continue;
    run = addDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

// Done in the last 7 days, today included.
function doneThisWeek(ticks, todayKey) {
  var n = 0;
  for (var back = 0; back < 7; back++) if (has(ticks, addDays(todayKey, -back))) n++;
  return n;
}

// How many items are ticked today, out of all of them.
function doneToday(items, ticksById, todayKey) {
  var n = 0;
  for (var i = 0; i < (items || []).length; i++) if (has((ticksById || {})[items[i].id], todayKey)) n++;
  return n;
}

// Tick or untick an item for today; returns the new ticks map (never mutates the old one).
function toggle(ticksById, id, todayKey, allowUntick) {
  var next = {};
  for (var k in ticksById || {}) next[k] = ticksById[k].slice();
  var list = next[id] || [];
  var at = list.indexOf(todayKey);
  if (at === -1) list.push(todayKey);
  else if (allowUntick) list.splice(at, 1);
  next[id] = list;
  return next;
}

exports.dayKey = dayKey;
exports.addDays = addDays;
exports.today = today;
exports.lastDays = lastDays;
exports.streak = streak;
exports.bestStreak = bestStreak;
exports.doneThisWeek = doneThisWeek;
exports.doneToday = doneToday;
exports.toggle = toggle;
