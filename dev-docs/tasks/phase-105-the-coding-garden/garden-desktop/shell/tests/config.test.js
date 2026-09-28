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
  assert.equal(config.name, "Olive's Island");
  assert.equal(config.nameFr, "L'île d'Olive");
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
  assert.ok(pkg.build.nsis.artifactName.startsWith('OlivesIsland-Setup-'));
});

test('the name a person sees is "Olive\'s Island" (ruling 7); every internal id stays', () => {
  assert.equal(pkg.productName, "Olive's Island", 'productName: the Mac bundle, the Windows exe, its FileDescription, the shortcut');
  assert.equal(pkg.build.productName, config.name);
  // Internal ids: the package name (the Windows install folder, %LOCALAPPDATA%\Programs\garden-desktop), the appId (the
  // NSIS GUID is UUIDv5(appId): an installer of the renamed app upgrades the old one in place), the door, the data dir.
  assert.equal(pkg.name, 'garden-desktop');
  assert.equal(pkg.build.appId, 'io.digitalbricks.garden');
  assert.equal(config.appId, 'garden');
  assert.equal(config.dataDirName, 'island');
  // The installer's FILE name carries neither the apostrophe nor a space: it is typed, linked and globbed by scripts.
  assert.doesNotMatch(pkg.build.nsis.artifactName, /['’ ]/);
  assert.equal(pkg.build.executableName, undefined, 'the exe keeps the product name ("Olive\'s Island.exe"), measured safe in electron-builder');
  // Code, not comments: a comment may say why the folder keeps the old name.
  for (const f of ['main.js', 'relay.js', 'copies.js', 'fit.js']) {
    const code = read(f).split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l));
    assert.deepEqual(code.filter((l) => /Bot Garden/.test(l)), [], `${f} names the old game in code`);
  }
});

test('the saves stay where they were: userData AND sessionData are pinned to "Bot Garden" whatever the app is called', () => {
  const { loadMainWithFakeElectron, tmp } = require('./helpers');
  const appData = tmp('garden-appdata-');
  const r = loadMainWithFakeElectron({ appData });
  assert.equal(r.name, "Olive's Island", 'the app is named for a person');
  assert.equal(config.userDataDirName, 'Bot Garden', 'the folder every build before the rename wrote (productName "Bot Garden")');
  const pinned = path.join(appData, 'Bot Garden');
  assert.equal(r.final('userData'), pinned);
  assert.equal(r.final('sessionData'), pinned, 'Local Storage (the family, key bot-garden) lives under sessionData');
  assert.ok(fs.existsSync(pinned), 'the folder exists before Electron is handed it');
  // Pinned BEFORE anything reads it: the first read of userData comes after the set, and before the single-instance lock.
  const i = (pred) => r.calls.findIndex(pred);
  const set = i((c) => c[0] === 'setPath' && c[1] === 'userData');
  const firstRead = i((c) => c[0] === 'getPath' && c[1] === 'userData');
  const lock = i((c) => c[0] === 'requestSingleInstanceLock');
  assert.ok(set >= 0 && set < firstRead && firstRead < lock, JSON.stringify(r.calls));
  assert.ok(!fs.existsSync(path.join(appData, "Olive's Island")), 'no island opened under the new name');
});

test('a drive’s GARDEN_HOME still keeps every folder under the throwaway home', () => {
  const { loadMainWithFakeElectron, tmp } = require('./helpers');
  const appData = tmp('garden-appdata-');
  const home = tmp('garden-home-');
  const r = loadMainWithFakeElectron({ appData, home });
  assert.equal(r.final('userData'), path.join(home, 'userData'));
  assert.equal(r.final('sessionData'), path.join(home, 'userData'));
  assert.equal(r.final('documents'), path.join(home, 'Documents'));
  assert.ok(!fs.existsSync(path.join(appData, 'Bot Garden')), 'the real folder untouched');
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

test('the French half of every dialog names the game in French ("L’île d’Olive"), the English half in English', () => {
  const main = read('main.js');
  const fr = [...main.matchAll(/\$\{config\.(name|nameFr)\} (s'est arrêté|n'a pas pu s'ouvrir)/g)].map((m) => m[1]);
  const en = [...main.matchAll(/\$\{config\.(name|nameFr)\} (stopped unexpectedly|couldn't open)/g)].map((m) => m[1]);
  assert.deepEqual(fr, ['nameFr', 'nameFr'], 'both French sentences');
  assert.deepEqual(en, ['name', 'name'], 'both English sentences');
});
