/**
 * TPL-010-M — the money, as arithmetic every money Function pastes in after `PLANNER_FNS`.
 *
 * One list of what comes in and goes out (`MoneyItem`), the repeats changed or ticked by hand
 * (`MoneyMark`), and the bank balance as read on a day (`BalanceReading`). Nothing here reads
 * the backend and nothing writes; `Logic/Money` and `Logic/Money pane` run it over the rows
 * `Logic/Planner data` hands them, and the gates run it with the clock held.
 *
 * ## The rules it carries (TPL-010-MONEY.md §3)
 *
 * - **M3** — once · weekly · monthly · quarterly · yearly, from `date` to `until` (inclusive). A
 *   monthly on the 31st lands on the 30th in a 30-day month; `monthEnd` lands on the last day;
 *   yearly on 29 Feb lands on 28 Feb in other years.
 * - **M4 / M10** — a repeat with no mark is exactly its item. A mark's `amount` and `date` change
 *   that one repeat, and changing the item leaves them alone.
 * - **M6 / M11 / M11a** — nothing happened until it is ticked. A tick is a payment on the mark's
 *   `payments` list; a repeat is closed when what was paid reaches what was due, or when it is
 *   skipped or written off (`lostOn`). An open repeat whose date has passed is **late**, and the
 *   projection counts what is left of it **as if it happens today**.
 * - **M7** — hoped money (`likelihood` under 100) is never in a balance.
 * - **M12 / M13 / M22** — the month's target smooths (weekly × 52 ÷ 12, quarterly ÷ 3, yearly ÷ 12)
 *   over the expected items that belong to no project; the fixed bills that go out this month
 *   come off it first, what is left is divided by the usual hourly rate, and the fixed projects'
 *   agreed hours are added back on.
 * - **M17** — the month is counted by the day a bill goes out, not the day it is paid.
 * - **M23** — an hourly project's `fromHours` bill is the hours logged since its previous bill ×
 *   the project's rate, until it is marked sent.
 *
 * 🔴 **Dates are strings and the arithmetic is UTC.** `YYYY-MM-DD` in, `YYYY-MM-DD` out, and the
 * day counting goes through `Date.UTC`, so a clock change in March or October never moves a
 * repeat by a day. `PLANNER_FNS`' local-time helpers are for the week; these are for money.
 *
 * @module noodl-mcp/tests/tpl010Money
 */

export const MONEY_REPEATS = ['once', 'weekly', 'monthly', 'quarterly', 'yearly'] as const;

export const MONEY_FNS = String.raw`
function mD(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN; }
function mS(t) { return new Date(t).toISOString().slice(0, 10); }
function mOk(s) { return isFinite(mD(s)); }
function mAddDays(s, n) { return mS(mD(s) + n * 86400000); }
function mDim(y, m0) { return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate(); }
function mAddMonths(s, k, monthEnd) {
  var y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)), d = Number(s.slice(8, 10));
  var t = m - 1 + k, Y = y + Math.floor(t / 12), M = ((t % 12) + 12) % 12;
  var day = monthEnd ? mDim(Y, M) : Math.min(d, mDim(Y, M));
  return mS(Date.UTC(Y, M, day));
}
function mMonth(s) { return String(s).slice(0, 7); }
function mMonthEnd(s) { var y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)); return mS(Date.UTC(y, m - 1, mDim(y, m - 1))); }
function mBetween(a, b) { return Math.round((mD(b) - mD(a)) / 86400000); }
var MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function mWeekday(s) { return new Date(mD(s)).getUTCDay(); }
/** "Wed 16 Sep" */
function mDay(s) { var t = new Date(mD(s)); return WEEKDAY_LONG[t.getUTCDay()].slice(0, 3) + ' ' + t.getUTCDate() + ' ' + MON[t.getUTCMonth()]; }
/** "Wed 16" */
function mShort(s) { var t = new Date(mD(s)); return WEEKDAY_LONG[t.getUTCDay()].slice(0, 3) + ' ' + t.getUTCDate(); }
function mOrd(n) { return n + (n % 100 > 10 && n % 100 < 14 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'); }
function mEur(n, signed) {
  var v = Math.round(num(n, 0));
  var s = '€' + Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (v < 0) return '−' + s;
  return signed && v > 0 ? '+' + s : s;
}
function mEur2(n) {
  var v = Math.round(num(n, 0) * 100) / 100;
  var whole = Math.floor(Math.abs(v)), cents = Math.round((Math.abs(v) - whole) * 100);
  var s = '€' + whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (cents ? '.' + (cents < 10 ? '0' : '') + cents : '');
  return v < 0 ? '−' + s : s;
}

/** M3 — every scheduled date of an item up to and including 'to', stopping at its 'until'. */
function repeatsOf(it, to) {
  var out = [];
  if (!it || !mOk(it.date)) return out;
  var until = mOk(it.until) && it.until < to ? it.until : to;
  var rep = String(it.repeat || 'once');
  for (var k = 0; k < 800; k++) {
    var s;
    if (rep === 'weekly') s = mAddDays(it.date, 7 * k);
    else if (rep === 'monthly') s = mAddMonths(it.date, k, it.monthEnd === true);
    else if (rep === 'quarterly') s = mAddMonths(it.date, 3 * k, it.monthEnd === true);
    else if (rep === 'yearly') s = mAddMonths(it.date, 12 * k, false);
    else { if (k > 0) break; s = it.date; }
    if (s > until) break;
    out.push(s);
  }
  return out;
}
function markKey(itemId, occurs) { return String(itemId) + '|' + String(occurs); }
function marksById(marks) {
  var by = {};
  for (var i = 0; i < (marks || []).length; i++) { var m = marks[i]; if (m && m.itemId) by[markKey(m.itemId, m.occurs)] = m; }
  return by;
}
/** A tick is a payment: { day, amount }, signed as its item is. */
function paymentsOf(m) {
  var out = [], list = (m && m.payments) || [];
  for (var i = 0; i < list.length; i++) if (list[i] && mOk(list[i].day) && num(list[i].amount, 0) !== 0) out.push({ day: String(list[i].day), amount: num(list[i].amount, 0) });
  return out;
}
function isClient(it, projectsById) {
  var p = it && it.projectId ? projectsById[it.projectId] : null;
  return !!p && (num(it.amount, 0) > 0 || it.fromHours === true);
}
function billingOf(p) { return p && p.billing === 'fixed' ? 'fixed' : 'hourly'; }

/**
 * The money context: everything a repeat needs to know about the world. Built once per run.
 * 'blocks' are the time the hours bills are counted from (M23).
 */
function moneyContext(items, marks, projects, blocks, today, since) {
  var byP = {};
  for (var i = 0; i < (projects || []).length; i++) if (projects[i]) byP[projects[i].id] = projects[i];
  var list = [];
  for (var j = 0; j < (items || []).length; j++) if (items[j] && items[j].id) list.push(items[j]);
  // Marks are read for thirteen months back ('since'). A repeat older than that is history: without its
  // mark it would read as unticked, and a weekly item two years old would be a hundred late rows.
  return { items: list, marks: marksById(marks), projects: byP, blocks: blocks || [], today: today, since: mOk(since) ? String(since) : '' };
}
/** M23 — the hours logged on a project from 'from' to 'to', both inclusive. */
function hoursBetween(ctx, projectId, from, to) {
  var t = 0;
  for (var i = 0; i < ctx.blocks.length; i++) {
    var b = ctx.blocks[i];
    if (!b || b.projectId !== projectId) continue;
    var d = String(b.date || '');
    if (d < from || d > to) continue;
    t += spentOf(b);
  }
  return q(t);
}
/** When the bill before this one went out, for the same project — the start of an hours bill's period. */
function previousBillOut(ctx, projectId, before) {
  var best = '';
  for (var i = 0; i < ctx.items.length; i++) {
    var it = ctx.items[i];
    if (it.projectId !== projectId || !isClient(it, ctx.projects)) continue;
    var reps = repeatsOf(it, before);
    for (var r = 0; r < reps.length; r++) {
      var m = ctx.marks[markKey(it.id, reps[r])];
      var out = (m && mOk(m.sentOn)) ? String(m.sentOn) : billOutOf(it, reps[r]);
      if (out && out < before && out > best) best = out;
    }
  }
  return best;
}
function billOutOf(it, occurs) {
  if (it.repeat === 'once' || !it.repeat) return mOk(it.billDate) ? String(it.billDate) : '';
  var lead = Number(it.billLeadDays);
  return it.billLeadDays === null || it.billLeadDays === undefined || it.billLeadDays === '' || !isFinite(lead) ? '' : mAddDays(occurs, -Math.round(lead));
}

/** One repeat of one item, with its mark applied. */
function occOf(ctx, it, occurs) {
  var key = markKey(it.id, occurs);
  var m = ctx.marks[key] || null;
  var client = isClient(it, ctx.projects);
  var p = it.projectId ? ctx.projects[it.projectId] || null : null;
  var billOut = client ? billOutOf(it, occurs) : '';
  var sentOn = m && mOk(m.sentOn) ? String(m.sentOn) : '';
  var marked = m && m.amount !== null && m.amount !== undefined && m.amount !== '' && isFinite(Number(m.amount));
  var hoursBill = it.fromHours === true && !marked && !!p;
  var hours = 0, amount;
  if (hoursBill) {
    var end = billOut || occurs;
    var start = previousBillOut(ctx, it.projectId, end);
    start = start ? mAddDays(start, 1) : end.slice(0, 8) + '01';
    hours = hoursBetween(ctx, it.projectId, start, end < ctx.today ? end : ctx.today);
    amount = Math.round(hours * num(p.rate, 0) * 100) / 100;
  } else amount = marked ? num(m.amount, 0) : num(it.amount, 0);
  if (amount > 0 !== num(it.amount, 0) > 0 && !hoursBill && num(it.amount, 0) !== 0) amount = -amount;
  var pays = paymentsOf(m);
  var paid = 0, lastOn = '';
  for (var i = 0; i < pays.length; i++) { paid += pays[i].amount; if (pays[i].day > lastOn) lastOn = pays[i].day; }
  paid = Math.round(paid * 100) / 100;
  var lostOn = m && mOk(m.lostOn) ? String(m.lostOn) : '';
  var skip = !!(m && m.skip === true);
  // A ticked repeat is closed — changing its item afterwards does not reopen the past (M4). Only a part
  // payment with the rest still owed stays open, and Logic/Mark keeps what was due on its mark for that.
  var closed = skip || !!lostOn || (pays.length > 0 && (!marked || Math.abs(paid) >= Math.abs(amount) - 0.005));
  return {
    it: it, key: key, itemId: it.id, occurs: occurs, m: m, markId: m ? String(m.id || '') : '',
    date: m && mOk(m.date) ? String(m.date) : occurs,
    amount: amount, paid: paid, remaining: Math.round((amount - paid) * 100) / 100, lastOn: lastOn, payments: pays,
    closed: closed, skip: skip, lostOn: lostOn, client: client, project: p,
    hoped: num(it.likelihood, 100) < 100, likelihood: Math.max(0, Math.min(100, Math.round(num(it.likelihood, 100)))),
    changed: marked && !it.fromHours && num(m.amount, 0) !== num(it.amount, 0), moved: !!(m && mOk(m.date) && m.date !== occurs),
    billOut: billOut, sentOn: sentOn, hoursBill: hoursBill, hours: hours
  };
}
function allOccs(ctx, to) {
  var out = [];
  for (var i = 0; i < ctx.items.length; i++) {
    var reps = repeatsOf(ctx.items[i], to);
    for (var r = 0; r < reps.length; r++) if (!ctx.since || reps[r] >= ctx.since) out.push(occOf(ctx, ctx.items[i], reps[r]));
  }
  return out;
}
function byDate(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : b.remaining - a.remaining; }

/** M11 — the latest reading, and every payment ticked after it. */
function balanceNow(ctx, readings) {
  var r = null;
  for (var i = 0; i < (readings || []).length; i++) {
    var x = readings[i];
    if (!x || !mOk(x.date)) continue;
    if (!r || x.date > r.date || (x.date === r.date && String(x.createdAt || '') > String(r.createdAt || ''))) r = x;
  }
  var from = r ? String(r.date) : '', bal = r ? num(r.amount, 0) : 0, since = 0;
  for (var k in ctx.marks) {
    var pays = paymentsOf(ctx.marks[k]);
    for (var p = 0; p < pays.length; p++) if (!r || pays[p].day > from) { bal += pays[p].amount; since++; }
  }
  return { balance: Math.round(bal * 100) / 100, since: since, readOn: from, readAmount: r ? num(r.amount, 0) : 0, hasReading: !!r };
}

/** Every open, expected repeat up to 'to' — late ones first, counted today — with the balance after each. */
function projection(ctx, readings, to) {
  var now = balanceNow(ctx, readings);
  var os = allOccs(ctx, to);
  var late = [], future = [], hoped = [], bills = [];
  for (var i = 0; i < os.length; i++) {
    var o = os[i];
    if (o.closed) continue;
    if (o.billOut && !o.sentOn && o.billOut <= to) bills.push(o);
    if (o.hoped) { if (o.date >= ctx.today && o.date <= to) hoped.push(o); continue; }
    if (o.date < ctx.today) late.push(o);
    else if (o.date <= to) future.push(o);
  }
  late.sort(byDate); future.sort(byDate); hoped.sort(byDate);
  bills.sort(function (a, b) { return a.billOut < b.billOut ? -1 : a.billOut > b.billOut ? 1 : 0; });
  var run = now.balance, after = {};
  for (var l = 0; l < late.length; l++) { run += late[l].remaining; after[late[l].key] = Math.round(run * 100) / 100; }
  for (var f = 0; f < future.length; f++) { run += future[f].remaining; after[future[f].key] = Math.round(run * 100) / 100; }
  return { now: now, occs: os, late: late, future: future, hoped: hoped, bills: bills, after: after };
}

/** M12 — what one item counts for in a month's target. */
function perMonth(it) {
  var a = num(it.amount, 0), r = String(it.repeat || 'once');
  return r === 'weekly' ? a * 52 / 12 : r === 'monthly' ? a : r === 'quarterly' ? a / 3 : r === 'yearly' ? a / 12 : 0;
}
function activeOn(it, day) { return mOk(it.date) && (!mOk(it.until) || String(it.until) >= day); }

/** M12, M13, M22 — break-even, target, and the billable hours the month needs. */
function moneyTargets(ctx, settings) {
  var today = ctx.today, mk = mMonth(today);
  var outs = [], ins = [], out = 0, inn = 0;
  for (var i = 0; i < ctx.items.length; i++) {
    var it = ctx.items[i];
    if (it.projectId || num(it.likelihood, 100) < 100 || String(it.repeat || 'once') === 'once' || !activeOn(it, today)) continue;
    var pm = perMonth(it);
    if (pm < 0) { outs.push(it); out -= pm; } else if (pm > 0) { ins.push(it); inn += pm; }
  }
  var breakEven = Math.round((out - inn) * 100) / 100;
  var target = Math.round((breakEven + Math.max(0, num(settings.savingsTarget, 0))) * 100) / 100;
  var rate = num(settings.rate, 0);
  var os = allOccs(ctx, mMonthEnd(mAddMonths(today.slice(0, 8) + '01', 1, false)));
  var fixed = [], fixedSum = 0, agreedIds = [], agreed = 0;
  for (var j = 0; j < os.length; j++) {
    var o = os[j];
    if (!o.client || o.hoped || o.skip || o.lostOn || billingOf(o.project) !== 'fixed') continue;
    if (mMonth(o.billOut || o.date) !== mk) continue;
    fixed.push(o); fixedSum += o.amount;
    if (agreedIds.indexOf(o.it.projectId) < 0 && num(o.project.agreedHours, 0) > 0) { agreedIds.push(o.it.projectId); agreed += num(o.project.agreedHours, 0); }
  }
  var byHour = Math.max(0, target - fixedSum);
  var hourly = rate > 0 ? Math.ceil(byHour / rate - 1e-9) : 0;
  return {
    outs: outs, ins: ins, out: out, inn: inn, breakEven: breakEven, target: target, rate: rate,
    fixed: fixed, fixedSum: fixedSum, agreedIds: agreedIds, agreed: agreed, byHour: byHour, hourly: hourly,
    hours: rate > 0 ? hourly + agreed : 0
  };
}

/** M14 line 1 and M17 — the month by the day its bills go out. */
function monthLine(ctx, t) {
  var mk = mMonth(ctx.today);
  var os = allOccs(ctx, mMonthEnd(mAddMonths(ctx.today.slice(0, 8) + '01', 1, false)));
  var sent = 0, all = 0;
  for (var i = 0; i < os.length; i++) {
    var o = os[i];
    if (!o.client || o.hoped || o.skip || o.lostOn || mMonth(o.billOut || o.date) !== mk) continue;
    all += o.amount;
    if (o.sentOn || (!o.billOut && o.paid)) sent += o.amount;
  }
  var toGo = t.target - all;
  var hours = t.rate > 0 ? Math.ceil(Math.max(0, toGo) / t.rate - 1e-9) : 0;
  var text = toGo > 0
    ? 'Break-even ' + mEur(t.breakEven) + ' · target ' + mEur(t.target) + '. Billed ' + mEur(sent) + ' so far, ' + mEur(all) +
      ' with the bills still to go out this month · ' + mEur(toGo) + ' to target' + (t.rate > 0 ? ', about ' + hours + ' h.' : '.')
    : 'Break-even ' + mEur(t.breakEven) + ' · target ' + mEur(t.target) + '. Billed ' + mEur(all) + ' this month · ' + mEur(-toGo) + ' past target.';
  return { sent: sent, all: all, toGo: toGo, hours: hours, text: text, name: MONTH_LONG[Number(mk.slice(5, 7)) - 1] };
}

/** M7, M14 line 2 — each hoped item's next repeat, weighted by its likelihood. */
function mightEarn(ctx) {
  var nexts = [], weighted = 0, all = 0;
  var to = mAddMonths(ctx.today, 24, false);
  for (var i = 0; i < ctx.items.length; i++) {
    var it = ctx.items[i];
    if (num(it.likelihood, 100) >= 100 || !activeOn(it, ctx.today)) continue;
    var reps = repeatsOf(it, to);
    for (var r = 0; r < reps.length; r++) {
      var o = occOf(ctx, it, reps[r]);
      if (o.date >= ctx.today && !o.closed) { nexts.push(o); weighted += o.amount * o.likelihood / 100; all += o.amount; break; }
    }
  }
  return { nexts: nexts, weighted: weighted, all: all };
}

/** M14 line 3 — the lowest the balance goes in the next six weeks, counting from today. */
function lowestPoint(ctx, readings) {
  var p = projection(ctx, readings, mAddDays(ctx.today, 42));
  var lo = { balance: p.now.balance, date: ctx.today };
  var list = p.late.concat(p.future);
  for (var i = 0; i < list.length; i++) { var b = p.after[list[i].key]; if (b < lo.balance) lo = { balance: b, date: list[i].date < ctx.today ? ctx.today : list[i].date }; }
  return lo;
}

/** "every month on the 28th, from Jul 2026, no end" */
function scheduleWords(it, today) {
  var d = new Date(mD(it.date)), day = d.getUTCDate(), r = String(it.repeat || 'once');
  if (r === 'once') return 'once, ' + mDay(it.date);
  var w = r === 'weekly' ? 'every ' + WEEKDAY_LONG[d.getUTCDay()]
    : r === 'monthly' ? 'every month on the ' + (it.monthEnd === true ? 'last day' : mOrd(day))
    : r === 'quarterly' ? 'every three months on the ' + (it.monthEnd === true ? 'last day' : mOrd(day))
    : 'every year on ' + day + ' ' + MON[d.getUTCMonth()];
  var end = mOk(it.until) ? (String(it.until) < today ? 'ended ' + mDay(it.until) : 'until ' + MON[Number(String(it.until).slice(5, 7)) - 1] + ' ' + String(it.until).slice(0, 4)) : 'no end';
  return w + ', from ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear() + ', ' + end;
}
function repeatWord(it) { var r = String(it.repeat || 'once'); return r === 'quarterly' ? 'every 3 months' : r === 'once' ? '' : r; }
/** M11a — what the rest of a short payment is called. */
function restWords(o) { return o.client ? ['Still owed', 'Lost'] : o.amount > 0 ? ['Still to come', 'That’s all'] : ['Still to pay', 'That’s all']; }
function projectName(o) { return o.project ? String(o.project.name || '') : ''; }
`;
