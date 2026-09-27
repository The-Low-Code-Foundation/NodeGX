/**
 * Olive's doors on the relay (P105 CG-004 §2), in front of the backend proxy, under the shell's own prefix:
 *
 *   POST /__garden/olive          {rung, slots, lang, shape?, temperature?, options?} → {ok, value|text, ms, fallback?, reason?}
 *   GET  /__garden/olive/status   {model, reason, gpu, loadMs, lastMs, asked, fallbacks, busy, queued, exam, modelPath}
 *   POST /__garden/olive/exam     runs the exam (one at a time; 409 while one runs) → the results
 *
 * The page sends a rung id and slot values, never prompt text: the prompt is composed HERE from olive-templates.json
 * (`olive-check.compose`) after every slot passed `checkSlots`. A POST must carry the shell's header (`x-garden: 1`,
 * from garden.json), for the reason copies.js gives: a page on another site cannot send a custom header without a
 * CORS preflight, and nothing here answers one. The status door is a plain GET so a drive can read it.
 *
 * `status` is answered from memory, never behind the owl's queue, so it comes back while a completion runs (AC3).
 * Plain Node, no dependencies.
 */
'use strict';

const { checkSlots, compose, checkOutput } = require('./olive-check');
const { runExam, readResults, writeResults } = require('./exam');

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(json) });
  res.end(json);
}

function readJson(req, limit = 8192) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > limit) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

/**
 * @param {{ owl: {ask: Function, status: Function}, templates: object, dataDir: string, header?: string,
 *   prefix?: string, timings?: {line: Function}|null, log?: Function, now?: () => number }} o
 */
function createOliveDoors({ owl, templates, dataDir, header = 'x-garden', prefix = '/__garden/', timings = null, log = () => {}, now = () => Date.now() }) {
  let examRunning = false;
  let exam = readResults(dataDir);

  /** The whole path of one request: validate → compose → the owl → check the output. Never throws. */
  async function ask(req) {
    const t0 = now();
    const body = req && typeof req === 'object' ? req : {};
    const slots = checkSlots(templates, body.rung, body.slots, body.lang);
    if (!slots.ok) return { ok: false, fallback: true, reason: slots.reason, slot: slots.slot, ms: now() - t0 };
    const prompt = compose(templates, body.rung, slots.values, { lang: body.lang, shape: body.shape, temperature: body.temperature, options: body.options });
    const r = await owl.ask(prompt);
    if (!r.ok) {
      const out = { ok: false, fallback: true, reason: r.reason, ms: now() - t0 };
      if (timings) timings.line({ event: 'olive', rung: body.rung, ms: out.ms, ok: false, reason: r.reason });
      return out;
    }
    const checked = checkOutput(r.raw, prompt);
    const ms = now() - t0;
    if (timings) timings.line({ event: 'olive', rung: body.rung, ms, ok: checked.ok, reason: checked.reason });
    if (!checked.ok) {
      // The page never sees a refused text (it may hold the very word the blocklist caught); the log does, so a refusal
      // can be diagnosed afterwards (P02's must-contain misses on 2026-09-27 left no trace in the exam rows).
      log(`olive: ${body.rung} refused (${checked.reason}): ${JSON.stringify(String(r.raw).slice(0, 120))}`);
      return { ok: false, fallback: true, reason: checked.reason, ms };
    }
    return { ok: true, ...(checked.value !== undefined ? { value: checked.value } : { text: checked.text }), ...(checked.trimmed ? { trimmed: true } : {}), ms };
  }

  function status() {
    const s = owl.status();
    return { ...s, exam: exam ? { at: exam.at, ms: exam.ms, passed: exam.passed, failed: exam.failed, rungs: exam.rungs } : null, examRunning };
  }

  async function runAndKeep() {
    examRunning = true;
    try {
      const results = await runExam({ ask, timings, log, now });
      exam = results;
      try {
        writeResults(dataDir, results);
      } catch (e) {
        log(`exam: could not write results: ${e.message}`);
      }
      return results;
    } finally {
      examRunning = false;
    }
  }

  function handle(req, res, urlPath) {
    if (urlPath !== prefix + 'olive' && !urlPath.startsWith(prefix + 'olive/')) return false;
    const door = urlPath.slice((prefix + 'olive').length);
    if (req.method === 'GET' && door === '/status') {
      send(res, 200, status());
      return true;
    }
    if (req.method !== 'POST' || (door !== '' && door !== '/exam')) {
      send(res, 404, { error: 'no such door' });
      return true;
    }
    if (req.headers[header] !== '1') {
      send(res, 403, { error: 'only the garden asks for this' });
      return true;
    }
    if (door === '/exam') {
      if (examRunning) {
        send(res, 409, { error: 'the exam is running' });
        return true;
      }
      runAndKeep().then(
        (results) => send(res, 200, results),
        (e) => {
          log(`exam failed: ${e && e.message}`);
          send(res, 500, { error: 'exam failed' });
        }
      );
      return true;
    }
    readJson(req).then((body) => {
      if (!body) return send(res, 400, { ok: false, fallback: true, reason: 'bad-json' });
      ask(body).then((r) => send(res, 200, r));
    });
    return true;
  }

  return { handle, ask, status, runExam: runAndKeep, hasResults: () => !!exam };
}

module.exports = { createOliveDoors };
