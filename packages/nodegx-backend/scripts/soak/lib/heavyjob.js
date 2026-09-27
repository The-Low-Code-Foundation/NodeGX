'use strict';
/**
 * The heavy scheduled job — PRD-004 §3.3, the most transferable finding in the
 * field report.
 *
 * > *a CPU/RAM-heavy full ingest and diff every 30 minutes ran on the same nodes
 * > as user traffic and caused periodic slowdown*
 *
 * NodeGX has that shape today: `triggers/scheduler.ts` fires scheduled
 * workflows **in the process serving HTTP**. So the job here is not a synthetic
 * spin — it is the honest shape of the thing described: read a page of rows,
 * diff them, keep going for a while.
 *
 * 🔴 **It yields between passes, and that is deliberate.** An `await` every
 * pass means this is CPU *contention*, not an event loop nailed shut. A job
 * written as one unbroken synchronous block would freeze the server outright
 * and the "latency during a heavy run" delta would be a tautology rather than a
 * measurement. This is the version a competent author would write, and the
 * delta it produces is the one worth putting in front of someone.
 *
 * 🔴 **Every failure port is wired.** A workflow whose only wired path is the
 * happy one HANGS for the full timeout when a step is refused (CWF-018) — and a
 * scheduled job that hangs instead of failing would look, from the outside,
 * exactly like the slowdown we are trying to measure.
 *
 * @module nodegx-backend/scripts/soak/heavyjob
 */

const TRIGGER_ID = 'soak-heavy-ingest';
const FUNCTION_NAME = 'soakHeavyIngest';

const node = (id, type, x, y, parameters = {}) => ({ id, type, x, y, parameters, ports: [], children: [] });

/** `runOnChange-<input>: false` — an input that must not re-run a node that has a control signal. */
const PASSIVE = (inputs) => Object.fromEntries(inputs.map((name) => [`runOnChange-${name}`, false]));

/**
 * `Query Records` publishes a Collection (an array behind a Proxy whose entries
 * are records, not plain objects), so `row.field` is `undefined` unless you go
 * through `.get()`. Same three lines every mapping script in this repo starts
 * with, for the same reason.
 */
const ROW_HELPERS = [
  'function rowsOf(input) {',
  '  var list = input || [];',
  '  return Array.prototype.map.call(list, function (row) {',
  '    if (row && typeof row.get === "function") {',
  '      var out = { __id: row.id };',
  '      var keys = Object.keys(row.data || {});',
  '      for (var i = 0; i < keys.length; i++) out[keys[i]] = row.get(keys[i]);',
  '      return out;',
  '    }',
  '    return row;',
  '  });',
  '}'
].join('\n');

/**
 * The ingest-and-diff script.
 *
 * `budgetMs` is interpolated rather than passed as an input port: the whole
 * point is a job whose duration is known to the harness, and a number the graph
 * carries is one fewer moving part than a port that has to be wired and set.
 */
function ingestScript(budgetMs) {
  return [
    ROW_HELPERS,
    'var rows = rowsOf(Inputs.items);',
    'var started = Date.now();',
    'var checked = 0;',
    'var digest = 0;',
    'var previous = Object.create(null);',
    '',
    '// One pass = one "diff the batch we just pulled" cycle: serialise each row,',
    '// hash it, and compare against what we held for that id last time. This is',
    '// what an ingest actually spends its CPU on.',
    'async function pass() {',
    '  for (var i = 0; i < rows.length; i++) {',
    '    var row = rows[i];',
    '    var text = JSON.stringify(row);',
    '    var h = 0;',
    '    for (var c = 0; c < text.length; c++) { h = (h * 31 + text.charCodeAt(c)) | 0; }',
    '    var id = row.__id || String(i);',
    '    if (previous[id] !== h) { digest = (digest ^ h) | 0; previous[id] = h; }',
    '    checked++;',
    '  }',
    '}',
    '',
    'while (Date.now() - started < ' + budgetMs + ') {',
    '  await pass();',
    '  // Yield. See the module docblock: contention, not a frozen event loop.',
    '  await new Promise(function (resolve) { setTimeout(resolve, 0); });',
    '}',
    '',
    'Outputs.checked = checked;',
    'Outputs.digest = String(digest);'
  ].join('\n');
}

/**
 * The workflow bundle: one cloud function the scheduler can target.
 *
 * It reads `MyDay` — the largest collection — so the job contends for the
 * database as well as for the CPU, which is what a real ingest does.
 */
function workflowBundle({ budgetMs = 45_000, collection = 'MyDay' } = {}) {
  return {
    components: [
      {
        name: `/#__cloud__/${FUNCTION_NAME}`,
        nodes: [
          node('req', 'noodl.cloud.request', 0, 0, { allowNoAuth: true }),
          node('rows', 'DbCollection2', 0, 120, {
            collectionName: collection,
            ...PASSIVE(['collectionName', 'querySettings'])
          }),
          node('ingest', 'JavaScriptFunction', 0, 260, {
            ...PASSIVE(['in-items']),
            scriptInputs: 'items',
            scriptOutputs: 'checked,digest',
            functionScript: ingestScript(budgetMs)
          }),
          node('res', 'noodl.cloud.response', 0, 420, { params: 'outcome', 'pm-outcome': 'ingested' }),
          node('resErr', 'noodl.cloud.response', 320, 420, { params: 'outcome', 'pm-outcome': 'failed' })
        ],
        connections: [
          { sourceId: 'req', sourcePort: 'receive', targetId: 'rows', targetPort: 'storageFetch' },
          { sourceId: 'rows', sourcePort: 'items', targetId: 'ingest', targetPort: 'in-items' },
          { sourceId: 'rows', sourcePort: 'fetched', targetId: 'ingest', targetPort: 'run' },
          { sourceId: 'ingest', sourcePort: 'success', targetId: 'res', targetPort: 'send' },

          // The wired failure paths. Without these a refused query is a 40-second
          // silence, not an error.
          { sourceId: 'rows', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' },
          { sourceId: 'ingest', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
        ],
        roots: []
      }
    ],
    settings: {},
    metadata: {}
  };
}

/**
 * The schedule.
 *
 * Authored **disabled**, with `missedFirePolicy: 'run-once-on-start'` and a
 * `lastFiredAt` in the past. That combination means a catch-up fire is due the
 * instant the trigger is armed — so the harness can start a heavy run *on
 * demand*, with `POST /admin/triggers/:id/enabled`, rather than waiting on a
 * clock boundary and hoping the measurement window lines up with it.
 *
 * The cron is minutely so the job keeps re-firing for as long as the arm lasts.
 * `overlapPolicy: 'skip'` is authored, not inherited: a fire that arrives while
 * the last one is still running is the ordinary case for a job like this, and
 * the record should say what was decided.
 */
function triggersFile() {
  return {
    version: 1,
    maxChangeDepth: 1,
    triggers: [
      {
        id: TRIGGER_ID,
        type: 'schedule',
        name: 'Soak: heavy ingest and diff',
        enabled: false,
        target: { kind: 'function', name: FUNCTION_NAME },
        schedule: { cron: '* * * * *', missedFirePolicy: 'run-once-on-start', overlapPolicy: 'skip' },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        status: { lastFiredAt: '2026-01-01T00:00:00.000Z', nextFireAt: null, lastResult: null, fireCount: 0 }
      }
    ]
  };
}

/** Arm or disarm the schedule. Returns the route's answer for the record. */
async function setArmed(base, adminToken, enabled) {
  const res = await fetch(`${base}/admin/triggers/${TRIGGER_ID}/enabled`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ enabled })
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`arming the heavy job answered ${res.status}: ${body}`);
  return body;
}

module.exports = { TRIGGER_ID, FUNCTION_NAME, workflowBundle, triggersFile, setArmed, ingestScript };
