/**
 * THE DEMO'S CLOCK — ONE OWNER FOR "ALWAYS HAPPENING NOW" (TASK-L180).
 *
 * The fixtures are a programme seen from one instant, FIXTURE_NOW. Every timeline
 * `state` in them (done / now / ahead) is true at that instant and at no other,
 * while the pace tracker, the roster's "last seen" and the programme scope read
 * the browser's clock. A frozen fixture therefore drifts away from its own pages
 * a little more every day.
 *
 * The public demo moves the WHOLE WORLD forward instead: every date in a fixture
 * moves by the same whole number of days, so the fixture is always seen from
 * the same distance, and every precomputed state stays true.
 *
 *   days = floor((now − FIXTURE_NOW) / 1 day)
 *
 * FLOOR, NOT ROUND, measured (L180 "Measured before design"): the three entries
 * nearest FIXTURE_NOW are all BEFORE it (a signal and two messages, 4–16 hours
 * earlier) and nothing sits within 72 hours AFTER it. With floor, the viewer's
 * now lands in [shifted FIXTURE_NOW, +24h), so every `done` stays in the past
 * and every `ahead` in the future. Round would put a done message up to 8 hours
 * into the viewer's future. Whole days keep each time of day: a 10:00 session
 * stays a 10:00 session.
 *
 * PROSE NAMES TWO MONTHS, and they have to move with the dates or the demo
 * contradicts itself: "by the end of November" (tied to the programme's end,
 * 27 Nov) and "Come back in September". A full English month name in any string
 * that is not a date becomes the month of its ANCHOR plus the same days: the
 * 15th of that month, or the 25th after "end of". The 25th, because the end
 * date is the 27th: anchoring on the 30th would say "end of December" while the
 * programme still ends on 28–30 November, and the 25th only ever lags by the two
 * days when the end has just crossed into the next month. tools/check-demo.mjs
 * pins which strings this touches, so a fixture that grows a "May I…" fails by
 * name rather than being quietly rewritten.
 *
 * CLOCK_SOURCE IS THE THING ITSELF, NOT A DESCRIPTION OF IT. It is embedded
 * verbatim in every generated responder (tools/build-demo.mjs) AND evaluated
 * here for the checks, so the rule the checks prove is the rule the page runs.
 * Plain ES5 on purpose: it runs inside a NodeGX Function node.
 */

export const FIXTURE_NOW_ISO = '2026-09-22T12:00:00.000Z';

export const CLOCK_SOURCE = `/* THE DEMO'S CLOCK — generated from tools/lib/demo-clock.mjs (TASK-L180). */
var DEMO_FIXTURE_NOW = Date.parse('${FIXTURE_NOW_ISO}');
var DEMO_DAY = 86400000;
var DEMO_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function demoShiftDays(nowMs) {
  return Math.floor((nowMs - DEMO_FIXTURE_NOW) / DEMO_DAY);
}
function demoFresh(value, nowMs) {
  var days = demoShiftDays(nowMs);
  if (days === 0) return value;
  var DATETIME = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z$/;
  var DATE = /^\\d{4}-\\d{2}-\\d{2}$/;
  var MONTH = /\\b(end of )?(January|February|March|April|May|June|July|August|September|October|November|December)\\b/g;
  function month(match, endOf, name) {
    var anchor = Date.UTC(2026, DEMO_MONTHS.indexOf(name), endOf ? 25 : 15) + days * DEMO_DAY;
    return (endOf || '') + DEMO_MONTHS[new Date(anchor).getUTCMonth()];
  }
  function walk(x) {
    if (typeof x === 'string') {
      if (DATETIME.test(x)) return new Date(Date.parse(x) + days * DEMO_DAY).toISOString();
      if (DATE.test(x)) return new Date(Date.parse(x + 'T00:00:00.000Z') + days * DEMO_DAY).toISOString().slice(0, 10);
      return x.replace(MONTH, month);
    }
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      var out = {};
      for (var k in x) if (Object.prototype.hasOwnProperty.call(x, k)) out[k] = walk(x[k]);
      return out;
    }
    return x;
  }
  return walk(value);
}
`;

const evaluated = new Function(`${CLOCK_SOURCE}\nreturn { demoFresh: demoFresh, demoShiftDays: demoShiftDays };`)();

/** The same function the page runs, for the checks. */
export const demoFresh = evaluated.demoFresh;
export const demoShiftDays = evaluated.demoShiftDays;
