/** AC1 (the queue, the timeout → fallback), AC4 (no model), AC6 (refused), the ≤ 64-token clamp, with a fake engine. */
'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const { createOwl, DEFAULTS } = require('../owl');
const { fakeEngine, wait } = require('./helpers');

const SENTENCE = { system: 's', user: 'u', shape: 'sentence', temperature: 0.8, maxTokens: 48, enumValues: null, mustContain: [], lang: 'fr' };

test('the default timeout is 12 s and the cap 64 tokens', () => {
  assert.equal(DEFAULTS.timeoutMs, 12_000);
  assert.equal(DEFAULTS.maxTokens, 64);
});

test('loaded once; two concurrent asks are served in order, never at once', async () => {
  const engine = fakeEngine({ delay: 60 });
  const owl = createOwl({ modelPath: __filename, engine });
  const s = await owl.load();
  assert.equal(s.model, 'ready');
  assert.equal(s.gpu, 'fake');
  assert.ok(s.loadMs >= 0);
  const a = owl.ask({ ...SENTENCE, user: 'first' });
  const b = owl.ask({ ...SENTENCE, user: 'second' });
  assert.equal(owl.status().queued, 2);
  const [ra, rb] = await Promise.all([a, b]);
  assert.equal(ra.ok, true);
  assert.equal(rb.ok, true);
  assert.equal(engine.calls.length, 2);
  assert.equal(engine.calls[0].user, 'first');
  assert.equal(engine.calls[1].user, 'second');
  assert.ok(engine.calls[1].start >= engine.calls[0].end, `the second started (${engine.calls[1].start}) before the first ended (${engine.calls[0].end})`);
  assert.equal(owl.status().asked, 2);
  assert.equal(owl.status().busy, 0);
  await assert.doesNotReject(owl.load(), 'a second load is a no-op');
  assert.equal(engine.calls.length, 2);
});

test('a completion past the timeout is aborted and answers fallback:true, reason timeout; the next ask still runs', async () => {
  const engine = fakeEngine({ delay: 5_000 });
  const owl = createOwl({ modelPath: __filename, engine, timeoutMs: 80 });
  await owl.load();
  const t0 = Date.now();
  const r = await owl.ask(SENTENCE);
  assert.deepEqual({ ok: r.ok, fallback: r.fallback, reason: r.reason }, { ok: false, fallback: true, reason: 'timeout' });
  assert.ok(Date.now() - t0 < 1000, 'answered at the timeout, not at the model’s pace');
  await wait(10);
  assert.equal(engine.calls[0].aborted, true, 'the generation was told to stop');
  assert.equal(owl.status().fallbacks, 1);
  engine.calls.length = 0;
  const quick = createOwl({ modelPath: __filename, engine: fakeEngine({ delay: 5 }), timeoutMs: 80 });
  await quick.load();
  assert.equal((await quick.ask(SENTENCE)).ok, true, 'control: under the timeout it answers');
});

test('no model file (AC4): status says none and every ask is an immediate fallback', async () => {
  const owl = createOwl({ modelPath: '/nowhere/Qwen3.5-0.8B-Q4_K_M.gguf', engine: fakeEngine() });
  const s = await owl.load();
  assert.equal(s.model, 'none');
  assert.match(s.reason, /no model file/);
  const t0 = Date.now();
  const r = await owl.ask(SENTENCE);
  assert.deepEqual({ ok: r.ok, fallback: r.fallback, reason: r.reason }, { ok: false, fallback: true, reason: 'no-model' });
  assert.ok(Date.now() - t0 < 50);
  const none = createOwl({ engine: fakeEngine() });
  assert.equal((await none.load()).model, 'none');
});

test('a refused model (AC6) and a failed load answer fallbacks with their reason', async () => {
  const refused = createOwl({ modelPath: __filename, refused: 'sha256 mismatch', engine: fakeEngine() });
  assert.equal(refused.status().model, 'refused');
  assert.equal((await refused.load()).model, 'refused', 'load does not un-refuse');
  assert.equal((await refused.ask(SENTENCE)).reason, 'refused');
  const failed = createOwl({ modelPath: __filename, engine: fakeEngine({ loadFails: true }) });
  const s = await failed.load();
  assert.equal(s.model, 'failed');
  assert.match(s.reason, /fake load failure/);
  assert.equal((await failed.ask(SENTENCE)).reason, 'load-failed');
});

test('an ask before load is a fallback (not-loaded), never a wait; maxTokens is clamped to 64; the raw text is tidied', async () => {
  const engine = fakeEngine({ reply: () => 'Merci ! �' });
  const owl = createOwl({ modelPath: __filename, engine });
  assert.equal((await owl.ask(SENTENCE)).reason, 'not-loaded');
  await owl.load();
  const r = await owl.ask({ ...SENTENCE, maxTokens: 500 });
  assert.equal(engine.calls[0].maxTokens, 64);
  assert.equal(r.raw, 'Merci !');
  assert.equal(engine.calls[0].schema, null, 'a sentence has no grammar');
  await owl.ask({ ...SENTENCE, shape: 'blocks', enumValues: ['avancer', 'gauche', 'droite', 'arroser'] });
  assert.deepEqual(engine.calls[1].schema.properties.blocs.items.enum, ['avancer', 'gauche', 'droite', 'arroser']);
  await owl.close();
  assert.equal(owl.status().model, 'unloaded');
});
