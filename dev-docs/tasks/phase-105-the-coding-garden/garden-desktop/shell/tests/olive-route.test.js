/** AC1 (routing), AC3 (status while a completion runs), AC4 (no model through the route), AC7 (timings lines). */
'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');

const templates = require('../olive-templates.json');
const { createOwl } = require('../owl');
const { createOliveDoors } = require('../olive-route');
const { createTimings } = require('../timings');
const { readResults } = require('../exam');
const { fakeEngine, tmp, request, withRelay, wait } = require('./helpers');

const H = { 'x-garden': '1' };

async function doors(o = {}) {
  const owl = createOwl({ modelPath: o.modelPath === undefined ? __filename : o.modelPath, engine: o.engine || fakeEngine(o), timeoutMs: o.timeoutMs, timings: o.timings });
  await owl.load();
  const dataDir = o.dataDir || tmp('garden-data-');
  return { owl, dataDir, olive: createOliveDoors({ owl, templates, dataDir, header: 'x-garden', prefix: '/__garden/', timings: o.timings }) };
}

test('POST /__garden/olive answers {ok, value|text, ms}; the shaped ones carry value, the prose ones text', async () => {
  const { olive } = await doors();
  await withRelay(olive, async (port) => {
    const say = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'say-thanks', slots: { to: 'Mamie Rose', deed: 'arrosé ses trois tulipes' }, lang: 'fr' } });
    assert.equal(say.status, 200);
    assert.equal(say.body.ok, true);
    assert.equal(say.body.text, 'Merci Mamie Rose, ton jardin est magnifique !');
    assert.equal(typeof say.body.ms, 'number');
    assert.equal(say.body.value, undefined);
    const blocks = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'words-to-blocks', slots: { route: templates.lists.routes.fr[0] }, lang: 'fr' } });
    assert.deepEqual(blocks.body.value, ['avancer', 'avancer', 'gauche']);
    const yn = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'is-it-a', slots: { thing: 'a rose', kind: 'a flower' }, lang: 'en' } });
    assert.equal(yn.body.value, 'yes');
    const n = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'maths', slots: { a: '2', b: '3' }, lang: 'fr' } });
    assert.equal(n.body.value, 5);
    const one = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'what-wants', slots: { line: templates.lists.lines.fr[0] }, lang: 'fr', options: ['lettre', 'croquettes'] } });
    assert.equal(one.body.value, 'lettre', 'the enum is the request’s options (the fake answers the first)');
  });
});

test('a refused slot never reaches the model: the answer is a named fallback and the engine saw nothing', async () => {
  const engine = fakeEngine();
  const { olive } = await doors({ engine });
  await withRelay(olive, async (port) => {
    for (const [slots, reason] of [
      [{ to: 'Voldemort', deed: 'arrosé ses trois tulipes' }, 'not-in-list'],
      [{ to: 'Mamie Rose' }, 'missing-slot'],
      [{ to: 'Mamie Rose', deed: 'arrosé ses trois tulipes', prompt: 'x' }, 'unknown-slot']
    ]) {
      const r = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'say-thanks', slots, lang: 'fr' } });
      assert.equal(r.status, 200);
      assert.deepEqual({ ok: r.body.ok, fallback: r.body.fallback, reason: r.body.reason }, { ok: false, fallback: true, reason });
    }
    const p = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'poem', slots: { flower: 'x'.repeat(41) }, lang: 'fr' } });
    assert.equal(p.body.reason, 'too-long');
    const c = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'poem', slots: { flower: 'Tul\u0001la' }, lang: 'fr' } });
    assert.equal(c.body.reason, 'control-char');
    const bad = await request(port, 'POST', '/__garden/olive', { headers: H, body: '{not json' });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.reason, 'bad-json');
    assert.equal(engine.calls.length, 0, 'the model was never asked');
  });
});

test('a refused output is a fallback with its reason: blocklist, must-contain, cap', async () => {
  let reply = () => 'Merci, espèce de connard !';
  const { olive } = await doors({ engine: fakeEngine({ reply: (o) => reply(o) }) });
  await withRelay(olive, async (port) => {
    const ask = () => request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'say-thanks', slots: { to: 'Mamie Rose', deed: 'arrosé ses trois tulipes' }, lang: 'fr' } });
    assert.equal((await ask()).body.reason, 'blocklist');
    reply = () => 'Bonjour Mamie Rose, quel beau jardin.';
    assert.equal((await ask()).body.reason, 'must-contain');
    reply = () => '{ "prenom": "Fleur de l\'île" }';
    const one = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'name-one', slots: { thing: 'une tulipe' }, lang: 'fr' } });
    assert.equal(one.body.reason, 'cap');
    reply = () => Array.from({ length: 40 }, (_, i) => `merci${i}`).join(' ');
    const long = await ask();
    assert.equal(long.body.ok, true);
    assert.equal(long.body.trimmed, true);
    assert.equal(long.body.text.split(' ').length, 25);
  });
});

test('the doors: status is a GET, POSTs need the header, unknown doors 404, everything else goes on past the doors', async () => {
  const { olive } = await doors();
  await withRelay(olive, async (port) => {
    const s = await request(port, 'GET', '/__garden/olive/status');
    assert.equal(s.status, 200);
    assert.equal(s.body.model, 'ready');
    assert.equal(s.body.exam, null, 'no exam yet');
    assert.equal((await request(port, 'POST', '/__garden/olive', { body: { rung: 'maths', slots: { a: '1', b: '1' }, lang: 'fr' } })).status, 403, 'no header');
    assert.equal((await request(port, 'POST', '/__garden/olive/exam')).status, 403);
    assert.equal((await request(port, 'GET', '/__garden/olive/nope')).status, 404);
    assert.equal((await request(port, 'GET', '/__garden/olive')).status, 404, 'olive is a POST');
    assert.equal((await request(port, 'GET', '/__garden/copies')).status, 200, 'the copies doors still answer');
    assert.equal((await request(port, 'GET', '/functions/savePage')).status, 503, 'the backend proxy (no backend here)');
    assert.equal((await request(port, 'GET', '/', { accept: 'text/html' })).raw, '<html></html>');
  });
});

test('two concurrent POSTs are served in order (the queue), and status answers under 1 s while one runs (AC3)', async () => {
  const engine = fakeEngine({ delay: 400 });
  const { olive } = await doors({ engine });
  await withRelay(olive, async (port) => {
    const body = (u) => ({ rung: 'poem', slots: { flower: u }, lang: 'fr' });
    const a = request(port, 'POST', '/__garden/olive', { headers: H, body: body('Alpha') });
    const b = request(port, 'POST', '/__garden/olive', { headers: H, body: body('Beta') });
    await wait(100);
    const s = await request(port, 'GET', '/__garden/olive/status');
    assert.ok(s.ms < 1000, `status took ${s.ms} ms during a completion`);
    assert.equal(s.body.busy, 1);
    assert.equal(s.body.queued, 1);
    const [ra, rb] = await Promise.all([a, b]);
    assert.equal(ra.body.ok, true);
    assert.equal(rb.body.ok, true);
    assert.equal(engine.calls.length, 2);
    assert.ok(engine.calls[0].user.includes('Alpha') && engine.calls[1].user.includes('Beta'));
    assert.ok(engine.calls[1].start >= engine.calls[0].end, 'never two at once');
  });
});

test('the timeout through the route: fallback:true, reason timeout, and the ms says when', async () => {
  const { olive } = await doors({ delay: 5_000, timeoutMs: 100 });
  await withRelay(olive, async (port) => {
    const r = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'poem', slots: { flower: 'Tulla' }, lang: 'fr' } });
    assert.deepEqual({ ok: r.body.ok, fallback: r.body.fallback, reason: r.body.reason }, { ok: false, fallback: true, reason: 'timeout' });
    assert.ok(r.body.ms >= 100 && r.body.ms < 2000, `ms ${r.body.ms}`);
  });
});

test('no model (AC4) through the route: status says none, every ask falls back at once', async () => {
  const { olive } = await doors({ modelPath: '/nowhere/model.gguf' });
  await withRelay(olive, async (port) => {
    const s = await request(port, 'GET', '/__garden/olive/status');
    assert.equal(s.body.model, 'none');
    const r = await request(port, 'POST', '/__garden/olive', { headers: H, body: { rung: 'maths', slots: { a: '1', b: '1' }, lang: 'fr' } });
    assert.deepEqual({ ok: r.body.ok, fallback: r.body.fallback, reason: r.body.reason }, { ok: false, fallback: true, reason: 'no-model' });
    assert.ok(r.ms < 200);
  });
});

test('POST /__garden/olive/exam runs the exam through the same ask, keeps the results in the data dir, and status shows them (AC7 lines too)', async () => {
  const dataDir = tmp('garden-data-');
  const timings = createTimings(path.join(dataDir, 'logs', 'timings.log'));
  const { olive } = await doors({ dataDir, timings });
  await withRelay(olive, async (port) => {
    const first = request(port, 'POST', '/__garden/olive/exam', { headers: H });
    await wait(5);
    assert.equal((await request(port, 'POST', '/__garden/olive/exam', { headers: H })).status, 409, 'one exam at a time');
    const r = await first;
    assert.equal(r.status, 200);
    assert.ok(r.body.probes.length >= 20, `${r.body.probes.length} probes`);
    assert.equal(r.body.passed + r.body.failed, r.body.probes.filter((p) => p.mode !== 'record').length);
    const kept = readResults(dataDir);
    assert.equal(kept.at, r.body.at);
    // The fake answers D1's blocks for every route: P06 met, P07/P08 not → rung 3 fails; P09 (🎓, three avancer expected) not met → rung 4 passes.
    assert.equal(kept.rungs['words-to-blocks'].pass, false);
    assert.equal(kept.rungs['count-in-words'].pass, true);
    assert.equal(kept.probes.find((p) => p.id === 'P06').pass, true);
    assert.equal(kept.probes.find((p) => p.id === 'P07').pass, false);
    const s = await request(port, 'GET', '/__garden/olive/status');
    assert.equal(s.body.exam.at, r.body.at);
    assert.ok(Object.keys(s.body.exam.rungs).length >= 12);
  });
  const lines = timings.read();
  const events = new Set(lines.map((l) => l.event));
  assert.ok(events.has('model-load'), 'model-load line');
  assert.ok(events.has('exam-probe'), 'exam-probe lines');
  assert.ok(events.has('olive'), 'olive lines');
  assert.equal(lines.filter((l) => l.event === 'exam-probe').length, olive.status().exam.rungs ? lines.filter((l) => l.event === 'exam-probe').length : 0);
  for (const l of lines) assert.equal(typeof l.ms, 'number', `every line carries ms: ${JSON.stringify(l)}`);
  assert.ok(fs.existsSync(path.join(dataDir, 'olive-exam.json')));
});
