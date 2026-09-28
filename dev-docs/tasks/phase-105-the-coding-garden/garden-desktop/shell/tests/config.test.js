/** AC1 (config parameterisation) and AC5 (asarUnpack, static): garden.json carries the app; no "Nightbook" survives. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { test } = require('node:test');

const SHELL = path.join(__dirname, '..');
const config = require('../garden.json');
const pkg = require('../package.json');
const templates = require('../olive-templates.json');
const read = (f) => fs.readFileSync(path.join(SHELL, f), 'utf8');

test('garden.json names the app: id, name, a port that is not Nightbook’s, a data dir, the doors, the backups, the model', () => {
  assert.equal(config.appId, 'garden');
  assert.equal(config.name, 'Bot Garden');
  assert.notEqual(config.port, 47621);
  assert.ok(config.port > 1024 && config.port < 65536);
  assert.equal(config.dataDirName, 'island');
  assert.equal(config.doorPrefix, '/__garden/');
  assert.equal(config.header, 'x-garden');
  assert.match(config.backups.cron, /^\S+ \S+ \S+ \S+ \S+$/);
  assert.deepEqual(config.backups.retention, { keepLast: 1, keepDaily: 30, keepWeekly: 0 });
  assert.match(config.model.sha256, /^[0-9a-f]{64}$/);
  assert.match(config.model.url, /^https:\/\/huggingface\.co\/unsloth\/Qwen3\.5-0\.8B-GGUF\/resolve\/main\/Qwen3\.5-0\.8B-Q4_K_M\.gguf$/);
  assert.equal(config.model.file, 'Qwen3.5-0.8B-Q4_K_M.gguf');
  assert.equal(config.olive.timeoutMs, 12000);
  assert.ok(config.olive.maxTokens <= 64);
});

test('no "Nightbook" is left in main.js, relay.js, package.json (or copies, policy, olive-route) outside a "forked from" line', () => {
  for (const f of ['main.js', 'relay.js', 'package.json', 'copies.js', 'policy.js', 'olive-route.js', 'owl.js', 'exam.js', 'olive-check.js']) {
    const lines = read(f)
      .split('\n')
      .filter((l) => /nightbook/i.test(l) && !/forked from/i.test(l));
    assert.deepEqual(lines, [], `${f} still says Nightbook`);
  }
  const main = read('main.js');
  assert.ok(main.includes("'GARDEN_HOME'"), 'the throwaway-home env is GARDEN_HOME');
  assert.ok(!main.includes('NIGHTBOOK_HOME'));
  assert.ok(!/\bbook\b/i.test(main.replace(/Nightbook/g, '')), 'no "book" wording in main.js');
});

test('main.js reads every name from garden.json, never from a literal', () => {
  const main = read('main.js');
  for (const literal of ['47621', "'Nightbook'", "'book'", '/__nightbook/']) assert.ok(!main.includes(literal), `literal ${literal}`);
  for (const key of ['config.port', 'config.name', 'config.appId', 'config.dataDirName', 'config.doorPrefix', 'config.header', 'config.backups.cron', 'config.backups.folderName', 'config.policy', 'config.model.file', 'config.model.sha256', 'config.olive.timeoutMs']) {
    assert.ok(main.includes(key), `main.js reads ${key}`);
  }
});

test('package.json ships every module main.js requires, and unpacks node-llama-cpp’s binaries from the asar (AC5)', () => {
  const main = read('main.js');
  const required = [...main.matchAll(/require\('\.\/([\w.-]+)'\)/g)].map((m) => m[1]).map((n) => (n.endsWith('.json') ? n : n + '.js'));
  for (const f of required) {
    assert.ok(pkg.build.files.includes(f), `build.files lists ${f}`);
    assert.ok(fs.existsSync(path.join(SHELL, f)), `${f} exists`);
  }
  assert.ok(pkg.build.files.includes('node_modules/**/*'));
  assert.ok(pkg.build.asarUnpack.some((p) => p.startsWith('node_modules/node-llama-cpp/bins')), 'node-llama-cpp/bins unpacked');
  assert.ok(pkg.build.asarUnpack.some((p) => p.startsWith('node_modules/@node-llama-cpp/')), '@node-llama-cpp/* (the prebuilt binaries) unpacked');
  assert.equal(pkg.dependencies['node-llama-cpp'], '3.21.1');
  const to = pkg.build.extraResources.map((r) => r.to);
  for (const t of ['app', 'backend/cli.js', 'policy', 'workflows', 'model', 'licenses']) assert.ok(to.includes(t), `extraResources ${t}`);
  assert.equal(pkg.build.appId, 'io.digitalbricks.garden');
  assert.equal(pkg.build.productName, config.name);
  assert.ok(pkg.build.nsis.artifactName.startsWith('BotGarden-Setup-'));
});

test('no build.files exclusion drops a file node-llama-cpp reads at run time (AC5)', () => {
  // 2026-09-28, the first packaged Mac app: `!node_modules/node-llama-cpp/llama/**` shipped an owl that could not load —
  // "ENOENT, node_modules/node-llama-cpp/llama/binariesGithubRelease.json not found in …/app.asar", status `failed`,
  // every ask a fallback. Only the 34 MB llama.cpp source bundle may be left out.
  const glob = (p) => new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
  const excluded = pkg.build.files.filter((p) => p.startsWith('!')).map((p) => glob(p.slice(1)));
  const runtime = ['binariesGithubRelease.json', 'llama.cpp.info.json', 'package.json'].map((f) => `node_modules/node-llama-cpp/llama/${f}`);
  for (const f of runtime) assert.ok(!excluded.some((re) => re.test(f)), `${f} is shipped`);
  assert.ok(excluded.some((re) => re.test('node_modules/node-llama-cpp/llama/gitRelease.bundle')), 'the source bundle stays out');
});

test('the template table is whole: every rung has both languages, a known shape, a dial temperature, ≤ 64 tokens, slots that exist', () => {
  const rungs = Object.entries(templates.rungs);
  assert.equal(rungs.length, 15, 'twelve rungs (two each for rungs 2 and 8) plus the hint voicing');
  const numbers = new Set(rungs.map(([, r]) => r.n));
  for (let n = 1; n <= 12; n++) assert.ok(numbers.has(n), `ladder rung ${n} present`);
  assert.ok(templates.rungs['voice-hint']);
  for (const [id, r] of rungs) {
    assert.ok(['pass', 'fail'].includes(r.ladder), `${id} ladder`);
    assert.ok(templates.shapes[r.shape], `${id} shape ${r.shape}`);
    assert.ok(templates.temperatures.includes(r.temperature), `${id} temperature`);
    assert.ok(r.maxTokens <= 64, `${id} maxTokens`);
    assert.ok(r.user.fr && r.user.en, `${id} user fr+en`);
    const sys = typeof r.system === 'string' ? templates.systems[r.system] : r.system;
    assert.ok(sys && sys.fr && sys.en, `${id} system fr+en`);
    for (const [slot, spec] of Object.entries(r.slots)) {
      if (spec.list) {
        const list = templates.lists[spec.list];
        assert.ok(list && list.fr.length && list.en.length, `${id}.${slot} list ${spec.list} in both languages`);
        for (const L of ['fr', 'en']) for (const w of list[L]) assert.ok(w.length <= 120 && !/[\r\n\t\u0000-\u001f]/.test(w), `${spec.list}.${L} word "${w}" is a slot value`);
      } else assert.ok(spec.regex || spec.text, `${id}.${slot} has a list, a regex or is text`);
      for (const L of ['fr', 'en']) assert.ok(r.user[L].includes(`{${slot}}`) || sys[L].includes(`{${slot}}`) || id === 'voice-hint', `${id}.${slot} has a hole in ${L}`);
    }
    if (r.shape === 'one_of') assert.ok(templates.lists[r.options], `${id} options list`);
  }
  assert.deepEqual(templates.blocks, ['avancer', 'gauche', 'droite', 'arroser']);
  for (const k of templates.lists.hintKeys.fr) assert.ok(templates.hints[k] && templates.hints[k].fr && templates.hints[k].en, `hint ${k}`);
});

test('.gitignore keeps the model, node_modules and the build out of git', () => {
  const ignore = read('.gitignore').split('\n');
  for (const e of ['node_modules/', 'build-output/', 'dist/', 'model/']) assert.ok(ignore.includes(e), e);
});
