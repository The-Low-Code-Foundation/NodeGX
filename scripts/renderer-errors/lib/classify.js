/**
 * HLT-010 — the half of the renderer-error gate that decides, with no editor attached.
 *
 * Input is the text of a dev-stack log (`.logs/dev.log`, or the file the gate's own launch writes).
 * Output is a count of error EVENTS per class, and a verdict against a budget.
 *
 * ## Four sources, one tag
 *
 * `[renderer:error]` in that log comes from more than one writer, and they are not the same thing:
 *
 * | line                                              | writer                                   | channel      |
 * |---------------------------------------------------|------------------------------------------|--------------|
 * | `Editor: [renderer:error] (file.tsx:12) message`  | main.js `console-message` mirror         | `console`    |
 * | `[renderer:exception] Uncaught …`                 | dev-debug.js, CDP `Runtime.exceptionThrown` | `exception` |
 * | `[renderer:error] Failed to load resource … (x)`  | dev-debug.js, CDP `Log.entryAdded`       | `browser`    |
 * | `Editor: [renderer] process gone: …`              | main.js `render-process-gone` etc.       | `crash`      |
 *
 * The mirror line carries a process prefix (`Editor: `, written by `scripts/utils/process.ts`)
 * and the CDP lines do not, because dev-debug.js writes them straight to the file. That prefix is
 * how the channel is told apart, and it is why a `browser` line is Chromium's network stack and not
 * the app: HLT-004 §2a — no `catch` removes one, only not making the request does.
 *
 * ## 🔴 Events, not lines
 *
 * One event can be written by BOTH writers. An uncaught error reaches the mirror (`console`,
 * message starts `Uncaught`) and CDP (`exception`) — P99 §3's 116 `GUEST_VIEW_MANAGER_CALL`
 * rejections were 232 lines. And it is not only throws: Chromium's *"Not allowed to load local
 * resource"* reaches the mirror AND CDP's `Log.entryAdded` (measured in `.logs/dev.log`, 2026-09-22).
 * Neither writer alone is complete — CDP attaches a second or two after launch, so a boot-time
 * event is on the mirror only — so a class's count is the LARGER of its mirror count and its CDP
 * count, never their sum.
 *
 * ⚠️ That is exact only while a class holds one KIND of event. A rule whose `match` caught both an
 * app `console.error` and an unrelated network line would under-count, so a rule's `match` must
 * name one message, not a family. (Rules match the message only — the mirror can carry a message
 * the browser wrote, so a filter on the writer would be a filter on nothing.)
 */

const ANSI = /\u001b\[[0-9;]*m/g;

/** `Editor: [renderer:error] (bugtracker.ts:166) text` → parts. Prefix optional. */
const TAGGED = /^(?:([A-Za-z][\w -]*):\s)?\[(renderer|viewer):(error|exception)\]\s?(.*)$/;
const MIRROR_WHERE = /^\(([^()\s]+):(\d+)\)\s?(.*)$/;
const CRASH = /^(?:([A-Za-z][\w -]*):\s)?\[renderer\] (process gone|failed to load|preload error)(.*)$/;

/**
 * One line → one record, or null when the line is not an error.
 *
 * @returns {{ channel: 'console'|'exception'|'browser'|'crash', target: string, message: string,
 *            where: string|null, uncaught: boolean, line: number } | null}
 */
function parseLine(raw, line = 0) {
  const text = String(raw).replace(ANSI, '').replace(/\r$/, '');

  const crash = CRASH.exec(text);
  if (crash) {
    return { channel: 'crash', target: 'renderer', message: `${crash[2]}${crash[3]}`.trim(), where: null, uncaught: false, line };
  }

  const m = TAGGED.exec(text);
  if (!m) return null;
  const [, prefix, target, level, rest] = m;

  if (level === 'exception') {
    return { channel: 'exception', target, message: rest.trim(), where: null, uncaught: true, line };
  }

  if (prefix) {
    // The main-process mirror. `where` is empty when Chromium gave no source for the message.
    const w = MIRROR_WHERE.exec(rest);
    const message = (w ? w[3] : rest).trim();
    return {
      channel: 'console',
      target,
      message,
      where: w ? `${w[1]}:${w[2]}` : null,
      uncaught: /^Uncaught\b/.test(message),
      line
    };
  }

  return { channel: 'browser', target, message: rest.trim(), where: null, uncaught: false, line };
}

function parseLog(text) {
  const out = [];
  String(text)
    .split('\n')
    .forEach((l, i) => {
      const r = parseLine(l, i + 1);
      if (r) out.push(r);
    });
  return out;
}

/** The class a record belongs to: the first rule whose `match` finds the message. */
function classOf(record, rules) {
  for (const rule of rules) {
    if (rule._re.test(record.message)) return rule.id;
  }
  // Named by the message alone, never the writer — one event seen by both writers must land in
  // ONE class for the max() in countEvents to pair it.
  return `unknown:${record.channel === 'crash' ? 'crash:' : ''}${signature(record.message)}`;
}

/** A stable name for an unrecognised message: ids, numbers and hashes folded, first 90 chars. */
function signature(message) {
  return String(message)
    .replace(/https?:\/\/[^\s)]+/g, '<url>')
    .replace(/\b[0-9a-f]{8,}\b/gi, '<hex>')
    .replace(/\d+/g, 'N')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

function compileRules(budget) {
  return budget.classes.map((c) => Object.assign({}, c, { _re: new RegExp(c.match) }));
}

/**
 * Count EVENTS per class: max(mirror lines, CDP lines) + crash lines. See the header for why.
 */
function countEvents(records, budget) {
  const rules = compileRules(budget);
  const per = new Map();
  for (const r of records) {
    const id = classOf(r, rules);
    if (!per.has(id)) per.set(id, { mirror: 0, cdp: 0, crash: 0, samples: [] });
    const b = per.get(id);
    if (r.channel === 'console') b.mirror++;
    else if (r.channel === 'crash') b.crash++;
    else b.cdp++;
    if (b.samples.length < 2) b.samples.push({ line: r.line, channel: r.channel, where: r.where, message: r.message.slice(0, 240) });
  }
  const counts = {};
  for (const [id, b] of per) {
    counts[id] = { events: Math.max(b.mirror, b.cdp) + b.crash, lines: b.mirror + b.cdp + b.crash, samples: b.samples };
  }
  return counts;
}

/**
 * The verdict. A class over its budget fails; an UNKNOWN class fails whatever its count — a gate
 * that knew only the classes this phase named would be silent on the next one, which is the hole
 * HLT-010 exists to close.
 */
function grade(counts, budget) {
  const known = new Map(budget.classes.map((c) => [c.id, c]));
  const over = [];
  const unknown = [];
  for (const [id, c] of Object.entries(counts)) {
    const rule = known.get(id);
    if (!rule) unknown.push({ id, events: c.events, samples: c.samples });
    else if (c.events > rule.budget) over.push({ id, events: c.events, budget: rule.budget, samples: c.samples });
  }
  return { ok: over.length === 0 && unknown.length === 0, over, unknown };
}

/** Budget file shape check — a class with no reason is not a budget, it is a baseline. */
function validateBudget(budget) {
  const problems = [];
  const seen = new Set();
  for (const c of budget.classes || []) {
    if (!c.id || seen.has(c.id)) problems.push(`duplicate or missing id: ${c.id}`);
    seen.add(c.id);
    if (typeof c.budget !== 'number' || c.budget < 0) problems.push(`${c.id}: budget must be a number ≥ 0`);
    if (!c.reason || String(c.reason).trim().length < 20) problems.push(`${c.id}: needs a reason`);
    try {
      new RegExp(c.match);
    } catch (e) {
      problems.push(`${c.id}: bad match — ${e.message}`);
    }
  }
  return problems;
}

/** The log's sign that the editor died. Electron dying does not take the webpack servers with it,
 * so the stack stays "up" with no editor in it — `run.js` watches the log for this instead. */
const DEAD = /Lifecycle script `start:_dev` failed|process gone:/;

/**
 * Why the editor died, from the log. 🔴 Not "the first lines saying Error": webpack's compile output
 * names every module it builds, and `ErrorBoundary.module.scss` matched first — so the first run on
 * a Linux runner (2026-09-22) reported a stylesheet's filename as the cause of death. The death is
 * the line matching DEAD (or, if the process just exited, the end of the log); the cause is in the
 * few lines before it, once webpack's module chatter is dropped.
 */
function deathReason(log) {
  const lines = log.split('\n').filter((l) => l.trim() && !/LOG from |sass-loader|css-loader|<[ew]> |^\s*\|/.test(l));
  let end = lines.findIndex((l) => DEAD.test(l));
  end = end === -1 ? lines.length : end + 1;
  return lines.slice(Math.max(0, end - 6), end).map((l) => l.trim().slice(0, 200)).join(' | ') || '(the log says nothing)';
}

module.exports = { parseLine, parseLog, classOf, signature, countEvents, grade, validateBudget, DEAD, deathReason };
